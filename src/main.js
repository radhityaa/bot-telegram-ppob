import dotenv from "dotenv"
import { Telegraf, Markup } from "telegraf"
import axios from "axios"
dotenv.config()

axios.defaults.baseURL = process.env.ENDPOINT
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['TOKEN'] = process.env.TELEGRAM_TOKEN

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

async function checkUserRegister(userId) {
    try {
        const { data } = await axios.post('/users/check', {
            user_tel_id: userId
        })

        if (data.success) {
            return true
        }

        return false
    } catch (error) {
        console.error('Error checking user registration:', error)
        return false
    } Z
}

bot.telegram.setMyCommands([
    { command: 'start', description: "Mulai Transaksi" },
    { command: 'help', description: "Bantuan Penggunaan" },
    { command: 'cek_user', description: "Cek User ID" },
    { command: 'daftar_harga', description: "Daftar Harga" },
    { command: 'group_chat', description: "Grup Chat" },
    { command: 'channel', description: "Channel Informasi" },
])

bot.start((ctx) => {
    ctx.reply('Selamat datang di AyasyaTech PPOB! Silakan ketik /help untuk mendapatkan bantuan.', {
        reply_to_message_id: ctx.message.message_id
    })
})

bot.command('help', (ctx) => {
    ctx.reply('- Format Pendaftaran: /daftar\n- Format Transaksi: code#nomor_tujuan\n- Format Deposit: DEPOSIT#nominal\n- Format Cek Status: STATUS#nomor_tujuan\n\n- Cek Saldo: /saldo\n- Cek User ID: /cek_user\n\n- Riwayat Deposit: Akan Hadir \n- Riwayat Transaksi: Akan Hadir\n- Daftar Harga dan Kode: https://shorturl.at/eh59a\n- Grup Chat: https://t.me/+xn05VilELsdlNTc9\n- Channel Informasi: https://t.me/atippob', {
        reply_to_message_id: ctx.message.message_id
    })
})

bot.command('daftar', (ctx) => {
    ctx.reply('DAFTAR#nama lengkap#nama toko#nomor hp\n\ncontoh:\n DAFTAR#Rama Adhitya Setiadi#AyasyaTech#08123456789', {
        reply_to_message_id: ctx.message.message_id
    })
})

bot.command('saldo', async (ctx) => {
    try {
        const { data } = await axios.post('/users/saldo', { user_tel_id: ctx.from.id })
        ctx.reply(`Sisa saldo anda: ${data.data}`)
    } catch (error) {
        console.log(error)
        ctx.reply('Terjadi Kesalahan Server, Coba Ulangi.', {
            reply_to_message_id: ctx.message.message_id,
        })
    }
})

bot.command('cek_user', (ctx) => {
    ctx.reply(`User ID: ${ctx.from.id}`, {
        reply_to_message_id: ctx.message.message_id
    })
})

bot.on('text', async (ctx) => {
    const message = ctx.message.text.trim()
    const messageId = ctx.message.message_id
    const userId = ctx.from.id
    const chatId = ctx.chat.id

    // Cek apakah pengguna sudah terdaftar
    const isRegister = await checkUserRegister(userId)

    // Jika pengguna belum terdaftar dan menggunakan perintah `DAFTAR#`
    if (!isRegister && message.startsWith('DAFTAR#')) {
        const parts = message.split('#')

        if (parts.length === 4) {
            const [, fullname, shopeName, phone] = parts

            try {
                // Lakukan pendaftaran pengguna ke database
                await axios.post('/users/register', {
                    chat_id: chatId,
                    user_tel_id: userId,
                    name: fullname,
                    shop_name: shopeName,
                    phone: phone,
                })

                ctx.reply(`Pendaftaran berhasil!\nSelamat Bergabung di AyasyaTech PPOB\n\nNama Lengkap: ${fullname}\nNama Toko: ${shopeName}\nNo. HP: ${phone}\n\nTerima Kasih.`, {
                    reply_to_message_id: messageId,
                })
            } catch (error) {
                console.log(error)
                ctx.reply('Terjadi Kesalahan Server, Coba Ulangi.', {
                    reply_to_message_id: messageId,
                })
            }
        } else {
            ctx.reply('Format pendaftaran salah. Cek formatnya di: /daftar', {
                reply_to_message_id: messageId,
            })
        }
    }
    // Jika pengguna sudah terdaftar dan mencoba mendaftar lagi
    else if (isRegister && message.startsWith('DAFTAR#')) {
        ctx.reply('Anda sudah terdaftar. Tidak perlu melakukan pendaftaran lagi.', {
            reply_to_message_id: messageId,
        })
    } else if (!isRegister) {
        ctx.reply('Maaf, Anda belum terdaftar. Silakan ketik perintah berikut untuk mendaftar:\n\n/daftar', {
            reply_to_message_id: messageId,
        })
    } else if (message.startsWith('DEPOSIT#')) {
        const nominal = message.substring('DEPOSIT#'.length)

        if (!isNaN(nominal) && Number.isInteger(Number(nominal)) && nominal >= 10000 && nominal <= 10000000) {
            try {
                const { data } = await axios.post('/users/deposit', {
                    chat_id: chatId,
                    user_tel_id: userId,
                    nominal: nominal,
                })

                ctx.reply(`Hallo, ${data.data.user_name}.\nTerima Kasih telah melakukan deposit.\nDetail Deposit:\n\n- Invoice: ${data.data.invoice}.\n- Metode: ${data.data.method}.\n- Nominal: ${data.data.nominal}.\n- Fee: ${data.data.fee}.\n- Total Harus Dibayarkan: ${data.data.total}.\n- Saldo Diterima: ${data.data.amount_received}.\n- Expired: ${data.data.expired_at}.\n\nLink Pembayaran:\n${data.data.pay_url}\n\nHarap Dibayarkan sebelum waktu expired\n\nTerima Kasih.`, {
                    reply_to_message_id: messageId,
                })
            } catch (error) {
                console.log(error);
            }
        } else {
            ctx.reply(`Format nominal tidak valid. Masukkan angka saja dengan minimal 10.000 - 10.000.000.'`, {
                reply_to_message_id: messageId,
            })
        }
    } else if (message.startsWith('STATUS#')) {
        const target = message.substring('STATUS#'.length)

        if (!/^[0-9]{6,13}$/.test(target)) {
            ctx.reply('Format tujuan telepon salah. Masukkan angka saja.', {
                reply_to_message_id: messageId,
            })
            return
        }

        try {
            const { data } = await axios.post('/transaction/status', {
                user_tel_id: userId,
                target,
            })

            if (!data.success) {
                ctx.reply('Status transaksi tidak ditemukan.', {
                    reply_to_message_id: messageId,
                })
                return
            }

            ctx.reply(`Status Transaksi:\n\n- Invoice: ${data.data.invoice}\n- Produk: ${data.data.product_name}\n- Nomor Tujuan: ${target}\n- Harga: Rp.${data.data.price}\n- Keterangan: ${data.data.message}\n- SN: ${data.data.sn}\n- Status: ${data.data.status}\n\nTerima Kasih.`, {
                reply_to_message_id: messageId,
            })
        } catch (error) {
            console.error(error)
            ctx.reply('Terjadi kesalahan saat mencari status transaksi. Coba lagi nanti.')
        }
    } else if (message.includes('#')) {
        const [code, target] = message.split('#')

        const isValidCode = /^[A-Z0-9]+$/.test(code) // validasi kode product berupa huruf kapital dan angka
        const isValidTarget = /^[0-9]{6,20}$/.test(target) // validasi tujuan hanya angka dengan panjang 10-13 digit

        if (isValidCode && isValidTarget) {
            try {
                const { data } = await axios.post('/transaction/create', {
                    user_tel_id: userId,
                    buyerSkuCode: code,
                    target,
                })

                if (!data.success) {
                    ctx.reply(data.message, {
                        reply_to_message_id: messageId,
                    })
                    return
                }

                ctx.reply(`Transaksi berhasil!\n\n- Invoice: ${data.data.invoice}\n- Produk: ${data.data.product_name}\n- Nomor Tujuan: ${target}\n- Harga: Rp.${data.data.price}\n- Keterangan: ${data.data.message}\n- SN: ${data.data.sn}\n- Status: ${data.data.status}\n\nSisa Saldo: Rp.${data.data.saldo}\n\nTerima Kasih.`, {
                    reply_to_message_id: messageId,
                })
            } catch (error) {
                console.error(error)
                ctx.reply('Terjadi kesalahan saat memproses transaksi. Coba lagi nanti.', {
                    reply_to_message_id: messageId,
                })
            }
        } else {
            ctx.reply('Format transaksi salah. Gunakan format:\n\n KODE_PRODUK#NOMOR_TUJUAN\nContoh: TRI1#08123456789', {
                reply_to_message_id: messageId,
            })
        }
    } else {
        ctx.reply('Perintah tidak dikenali. Bantuan /help', {
            reply_to_message_id: messageId,
        })
    }
})









bot.command('pulsa', async (ctx) => {
    const [command, code, phone] = ctx.message.text.split(' ')

    if (!phone || !code) {
        return ctx.reply('Format salah. Gunakan /pulsa code_produk nomor_telepon')
    }

    try {
        // const result = await requestPPOB('pulsa', phone, amount)
        // ctx.reply(`Pulsa berhasil diproses. Detail transaksi:\nNomor: ${phone}\nJumlah: ${amount}\nStatus: ${result.status}`)
        ctx.reply(`Pulsa berhasil diproses. Detail transaksi:\nNomor: ${phone}\nStatus: Sukses ✅`)
    } catch (error) {
        console.error(error)
        ctx.reply('Terjadi kesalahan saat memproses transaksi.')
    }
})

bot.launch()
console.log('BOT PPOB berjalan...')
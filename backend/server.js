const express = require('express')
const mysql = require('mysql2/promise')
const cors = require('cors')
const bcrypt = require('bcrypt')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

const app = express()
const PORT = 8000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))


const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fashionweb',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10
})


db.getConnection()
    .then(conn => {
        // console.log()('Connected successful')
        conn.release()
    })
    .catch(err => console.error('DB Error:', err))


app.get('/', (req, res) => {
    res.send('Fashion API Running')
})

/* =====================================================
   USERS API
===================================================== */

// REGISTER USER  POST /fashion/api/users

app.post('/fashion/api/users', async (req, res) => {
    try {
        const { first_name, last_name, email, password, confirm_pass, user_role } = req.body

        if (password !== confirm_pass)
            return res.status(400).json({ message: 'Passwords do not match' })

        const [exist] = await db.query(
            'SELECT iid FROM users WHERE email=?',
            [email]
        )

        if (exist.length)
            return res.status(409).json({ message: 'Email already exists' })

        const hashed = await bcrypt.hash(password, 10)
        const uid = uuidv4()

        await db.query(
            `INSERT INTO users 
            (iid, first_name, last_name, email, pwd, confirm_pwd, user_role)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uid, first_name, last_name, email, hashed, hashed, user_role || 'Client']
        )

        res.status(201).json({ message: 'User registered successfully' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

// LOGIN (Basic Auth) GET /fashion/api/login

app.get('/fashion/api/login', async (req, res) => {
    try {
        const auth = req.headers.authorization
        if (!auth) return res.status(401).json({ message: 'Unauthorized' })

        const base64 = auth.split(' ')[1]
        const [email, password] = Buffer.from(base64, 'base64')
            .toString()
            .split(':')

        const [users] = await db.query(
            'SELECT * FROM users WHERE email=?',
            [email]
        )

        if (!users.length) return res.status(401).json({ message: 'Invalid credentials' })

        const user = users[0]
        const match = await bcrypt.compare(password, user.pwd)

        if (!match) return res.status(401).json({ message: 'Invalid credentials' })

        delete user.pwd
        delete user.confirm_pwd

        res.json(user)
    } catch (err) {
        res.status(500).json({ message: 'Server error' })
    }
})

// GET USERS BY ROLE

app.get('/fashion/api/users/role', async (req, res) => {
    const { role } = req.query
    const [users] = await db.query(
        'SELECT iid, first_name, last_name, email, user_role FROM users WHERE user_role=?',
        [role]
    )
    res.json(users)
})

// UPDATE USER
app.put('/fashion/api/users/:id', async (req, res) => {
    const { id } = req.params
    const { first_name, last_name, user_role } = req.body

    await db.query(
        `UPDATE users SET first_name=?, last_name=?, user_role=? WHERE iid=?`,
        [first_name, last_name, user_role, id]
    )

    res.json({ message: 'User updated' })
})

// DELETE USER

app.delete('/fashion/api/users/:id', async (req, res) => {
    const { id } = req.params
    await db.query('DELETE FROM users WHERE iid=?', [id])
    res.json({ message: 'User deleted' })
})

/* =====================================================
   ITEMS API
===================================================== */

const ITEMS_BASE = '/fashion/api/items'

// GET ALL ITEMS

app.get(ITEMS_BASE, async (req, res) => {
    const [rows] = await db.query(
        `SELECT * FROM items ORDER BY item_created DESC`
    )
    // console.log()(rows)
    res.json(rows)
})

// GET ITEM BY ID

app.get(`${ITEMS_BASE}/:iid`, async (req, res) => {
    const { iid } = req.params
    console.log('#####################################################')
    const [[item]] = await db.query(
        'SELECT * FROM items WHERE iid=?',
        [iid]
    )

    if (!item) return res.status(404).json({ message: 'Item not found' })

    const [sizes] = await db.query(
        'SELECT * FROM sizes WHERE item_id=?',
        [iid]
    )

    item.sizes = sizes
    const { image_main, image_details } = get_path(item.iid, item.gender, item.item_category)
    item.image_main = image_main
    item.image_details = image_details
    res.json(item)
})

// GET ITEMS BY USER

const get_path = (id, g, c) => {
    const dir = path.join(__dirname, 'images', g, c)
    if (!fs.existsSync(dir)) {
        return null
    }
    const images = fs.readdirSync(dir)
    const main_image = images.find(img => img.startsWith(`${id}_main`))
    const image_details = images.filter(img => !img.startsWith(`${id}_main`))
    console.log(main_image)
    return {
        image_main: main_image ? `${dir}/${main_image}` : '',
        image_details: image_details.map(imd => `${dir}/${imd}`)
    }
}


app.get(`${ITEMS_BASE}/:uid/user`, async (req, res) => {

    const [rows] = await db.query(
        'SELECT * FROM items WHERE user_id=?',
        [req.params.uid]
    )

    const data = rows.map(row => ({ ...row, ...get_path(row.iid, row.gender, row.item_category) }))
    // console.log()(data)
    res.json(data)
})

// GET ITEMS BY GENDER

app.get(`${ITEMS_BASE}/gender/:type`, async (req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM items WHERE gender=? ORDER BY item_created DESC',
        [req.params.type]
    )
    const data = rows.map(row => ({ ...row, ...get_path(row.iid, row.gender, row.item_category) }))
    res.json(data)
})

//  GET ITEMS BY CATEGORY

app.get(`${ITEMS_BASE}/category/:cat`, async (req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM items WHERE item_category=?',
        [req.params.cat]
    )
    res.json(rows)
})

// GET ITEMS BY GENDER + CATEGORY

app.get(`${ITEMS_BASE}/gender/:gender/category/:cat`, async (req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM items WHERE gender=? AND item_category=?',
        [req.params.gender, req.params.cat]
    )
    res.json(rows)
})

// CREATE ITEM

const store_images = (iname, base64, g, cat, isList = false) => {
    try {
        const gdir = path.join(__dirname, 'images', g)
        const cdir = path.join(gdir, cat)
        if (!fs.existsSync(gdir)) {
            fs.mkdirSync(gdir, { recursive: true })
        }

        if (!fs.existsSync(cdir)) {
            fs.mkdirSync(cdir, { recursive: true })
        }

        if (isList) {
            for (let idx in base64) {
                const b64 = base64[idx]
                const matches = b64.match(/^data:(image\/\w+);base64,(.+)$/)
                if (!matches) throw new Error('Invalid base64 image')

                const ext = matches[1].split('/')[1]
                const buffer = Buffer.from(matches[2], 'base64')

                const fileName = `${iname}_${idx}.${ext}`
                const filePath = path.join(cdir, fileName)

                fs.writeFileSync(filePath, buffer)
            }
        }
        else {
            const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/)
            if (!matches) throw new Error('Invalid base64 image')

            const ext = matches[1].split('/')[1]
            const buffer = Buffer.from(matches[2], 'base64')

            const fileName = `${iname}_main.${ext}`
            const filePath = path.join(cdir, fileName)

            fs.writeFileSync(filePath, buffer)
            return filePath
        }
    }
    catch (err) {
        throw new Error(err.message)    
    }
}

app.get(`${ITEMS_BASE}/image/item`, async (req, res) => {
    try {
        const image_path = req.query.img
        const fileBuffer = await fs.readFileSync(image_path)
        const ext = path.extname(image_path).slice(1)
        const base64Image = `${fileBuffer.toString('base64')}`

        res.json(base64Image)
        // return
    }
    catch (err) {
        throw err
    }
})

app.post(ITEMS_BASE, async (req, res) => {
    const iid = String(uuidv4())
    const item = req.body
    const ref = item['reference'] ? item.reference : `RF${iid.slice(1, 6)}`
    store_images(iid, item['image_main'], item['gender'], item['item_category'])
    store_images(iid, item['image_details'], item['gender'], item['item_category'], true)
    await db.query(
        `INSERT INTO items (
            iid, item_name, item_category, gender, quantity,
            item_model, actual_price, currency, edited_price,
            flash_sale, status_item, description, reference, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            iid,
            item.item_name,
            item.item_category,
            item.gender,
            item.quantity || 0,
            item.item_model,
            item.actual_price,
            item.currency,
            item.edited_price || 0,
            item.flash_sale || 0,
            item.status || 'Available',
            item.description,
            ref,
            item.user_id
        ]
    )

    if (item.sizes?.length) {
        for (const s of item.sizes) {
            await db.query(
                `INSERT INTO sizes (iid, size, quantity, item_id)
                 VALUES (?, ?, ?, ?)`, [String(uuidv4()), s.size, s.quantity, iid]
            )
        }
    }

    // store main_image

    // store image details

    res.status(201).json({ iid })
})

// UPDATE ITEM

const remove_image = (imagePath) => {
    try {
        if (!imagePath) return false

        const imagesRoot = path.join(__dirname, 'images')
        // const fullPath = path.normalize(path.join(imagesRoot, imagePath))

        if (!imagePath.startsWith(imagesRoot)) {
            return false
        }

        if (!fs.existsSync(fullPath)) {
            return false
        }

        fs.unlinkSync(fullPath)
        return true

    } catch (err) {
        return false
    }
}

app.put(`${ITEMS_BASE}/:iid`, async (req, res) => {
    try {
        const { iid } = req.params
        const item = req.body

        // check if item exists
        const [[exist]] = await db.query(
            'SELECT * FROM items WHERE iid=?',
            [iid]
        )
        

        if (!exist) {
            return res.status(404).json({ message: 'Item not found' })
        }

        const {image_main, image_details} = get_path(iid, exist.gender, exist.item_category)

        if (image_main){
            remove_image(image_main)
            for (let img of image_details){
                remove_image(img)
            }
        }

        // UPDATE IMAGES (ONLY IF SENT)
        if (item.image_main && item.image_main.startsWith('data:')) {
            store_images(iid, item.image_main, item.gender, item.item_category)
        }

        if (Array.isArray(item.image_details) && item.image_details.length) {
            store_images(iid, item.image_details, item.gender, item.item_category, true)
        }

        // UPDATE ITEM DATA
        await db.query(
            `UPDATE items SET
                item_name=?,
                item_category=?,
                gender=?,
                quantity=?,
                item_model=?,
                actual_price=?,
                currency=?,
                edited_price=?,
                flash_sale=?,
                status_item=?,
                description=?
             WHERE iid=?`,
            [
                item.item_name,
                item.item_category,
                item.gender,
                item.quantity || 0,
                item.item_model,
                item.actual_price,
                item.currency,
                item.edited_price || 0,
                item.flash_sale || 0,
                item.status || 'Available',
                item.description,
                iid
            ]
        )

        // UPDATE SIZES
        if (Array.isArray(item.sizes)) {
            // remove old sizes
            await db.query('DELETE FROM sizes WHERE item_id=?', [iid])

            // insert new sizes
            for (const s of item.sizes) {
                await db.query(
                    `INSERT INTO sizes (iid, size, quantity, item_id)
                     VALUES (?, ?, ?, ?)`,
                    [uuidv4(), s.size, s.quantity, iid]
                )
            }
        }
        res.json({ message: 'Item updated successfully' })
    }
    catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' })
    }
})

// UPDATE ITEM 

// app.put(`${ITEMS_BASE}/:iid`, async (req, res) => {
//     const { iid } = req.params
//     const item = req.body

//     await db.query(
//         `UPDATE items SET
//             item_name=?, item_category=?, quantity=?, item_model=?,
//             actual_price=?, currency=?, edited_price=?, flash_sale=?,
//             status_item=?, description=?, ref=?
//          WHERE iid=?`,
//         [
//             item.item_name,
//             item.item_category,
//             item.quantity,
//             item.item_model,
//             item.actual_price,
//             item.currency,
//             item.edited_price,
//             item.flash_sale,
//             item.status_item,
//             item.description,
//             item.ref,
//             iid
//         ]
//     )

//     await db.query('DELETE FROM sizes WHERE item_id=?', [iid])

//     if (item.sizes?.length) {
//         for (const s of item.sizes) {
//             await db.query(
//                 `INSERT INTO sizes (iid, size, quantity, item_id)
//                  VALUES (?, ?, ?, ?)`,
//                 [String(uuidv4()), s.size, s.quantity, iid]
//             )
//         }
//     }

//     res.json({ success: true })
// })


// DELETE ITEM // DELETE MULTIPLE ITEM

app.delete(`${ITEMS_BASE}/:iid`, async (req, res) => {
    await db.query('DELETE FROM items WHERE iid=?', [req.params.iid])
    res.json(true)
})

app.delete(ITEMS_BASE, async (req, res) => {
    const ids = req.body
    if (!Array.isArray(ids)) return res.status(400).json(false)

    await db.query('DELETE FROM items WHERE iid IN (?)', [ids])
    res.json(true)
})

// =======================
// START SERVER
// =======================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})


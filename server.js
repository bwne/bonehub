const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const Category = require('./models/Category');
const Script = require('./models/Script');

const app = express();

// Veritabanı Bağlantısı (Yerel MongoDB veya MongoDB Atlas kullanabilirsin)
mongoose.connect('mongodb://localhost:27017/scripthub')
.then(() => console.log('MongoDB Bağlantısı Başarılı.'))
.catch(err => console.log(err));

// Middleware Ayarları
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'script-hub-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Fotoğraf Yükleme Ayarı (Multer)
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- GÜVENLİK KONTROLÜ (ADMIN MIDDLEWARE) ---
function isAdmin(req, res, next) {
    if (req.session.username === 'bonecan123321') {
        return next();
    }
    res.redirect('/login');
}

// --- ROTACILAR (ROUTES) ---

// 1. Ziyaretçi Ana Sayfası (Arama ve Filtreleme Dahil)
app.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};

        if (search) {
            query.title = { $regex: search, $options: 'i' }; // Büyük/küçük harf duyarsız arama
        }
        if (category) {
            query.category = category;
        }

        const scripts = await Script.find(query).populate('category').sort({ created_at: -1 });
        const categories = await Category.find();

        res.render('index', { scripts, categories, selectedCategory: category, searchQuery: search });
    } catch (err) {
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. Script Detay Sayfası
app.get('/script/:id', async (req, res) => {
    try {
        const script = await Script.findById(req.params.id).populate('category');
        res.render('script-detail', { script });
    } catch (err) {
        res.redirect('/');
    }
});

// 3. Admin Login Sayfası
app.get('/login', (req, res) => {
    res.send('<form action="/login" method="POST"><input type="text" name="username" placeholder="Kullanıcı Adı" required><button type="submit">Giriş Yap</button></form>');
});

app.post('/login', (req, res) => {
    if (req.body.username === 'bonecan123321') {
        req.session.username = 'bonecan123321';
        return res.redirect('/admin');
    }
    res.send('Hatalı kullanıcı adı! Sadece kurucu girebilir.');
});

// 4. Admin Yönetim Paneli (Sadece bonecan123321 erişebilir)
app.get('/admin', isAdmin, async (req, res) => {
    const categories = await Category.find();
    const scripts = await Script.find().populate('category');
    res.render('admin', { categories, scripts });
});

// 5. Yeni Kategori Ekleme
app.post('/admin/category', isAdmin, async (req, res) => {
    try {
        await Category.create({ name: req.body.name });
        res.redirect('/admin');
    } catch (err) {
        res.send('Kategori zaten mevcut veya hata oluştu.');
    }
});

// 6. Yeni Script Ekleme (Fotoğraflı)
app.post('/admin/script', isAdmin, upload.single('image'), async (req, res) => {
    try {
        await Script.create({
            title: req.body.title,
            description: req.body.description,
            code: req.body.code,
            category: req.body.category,
            image: '/uploads/' + req.file.filename
        });
        res.redirect('/admin');
    } catch (err) {
        res.send('Script eklenirken hata oluştu.');
    }
});

// Sunucuyu Başlat
app.listen(3000, () => console.log('Sunucu http://localhost:3000 adresinde çalışıyor!'));

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const app = express();

// --- MONGODB ATLAS BAĞLANTI AYARI ---
// Buraya kendi MongoDB Atlas connection string'ini yapıştırmalısın!
const MONGO_URI = 'MONGO_URL_BURAYA'; 

mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB Atlas Bağlantısı Başarılı.'))
.catch(err => console.log('MongoDB Bağlantı Hatası:', err));

// --- VERİTABANI MODELLERİ ---
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});
const Category = mongoose.model('Category', CategorySchema);

const ScriptSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    code: { type: String, required: true },
    image: { type: String, required: true }, // Resim URL'si olarak tutulacak
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    created_at: { type: Date, default: Date.now }
});
const Script = mongoose.model('Script', ScriptSchema);

// --- MIDDLEWARE VE GÖRÜNÜM AYARLARI ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'bonecan-secret-key-123321',
    resave: false,
    saveUninitialized: true
}));

// --- YÖNETİCİ KONTROLÜ (MIDDLEWARE) ---
function isAdmin(req, res, next) {
    if (req.session.username === 'bonecan123321') {
        return next();
    }
    res.redirect('/login');
}

// --- ROTACILAR (ROUTES) ---

// 1. Ziyaretçi Ana Sayfası (Arama ve Filtreleme)
app.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        if (category) {
            query.category = category;
        }

        const scripts = await Script.find(query).populate('category').sort({ created_at: -1 });
        const categories = await Category.find();

        res.render('index', { scripts, categories, selectedCategory: category, searchQuery: search });
    } catch (err) {
        res.status(500).send('Sunucu Hatası oluştu.');
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

// 3. Admin Login Görüntüleme ve Giriş
app.get('/login', (req, res) => {
    res.send(`
        <body style="background:#0b111e; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
            <form action="/login" method="POST" style="background:#0f172a; padding:30px; border-radius:8px; border:1px solid #1e293b;">
                <h3 style="margin-top:0;">Kurucu Girişi</h3>
                <input type="text" name="username" placeholder="Kullanıcı Adı" required style="padding:10px; width:100%; margin-bottom:15px; background:#1e293b; border:1px solid #334155; color:white; border-radius:4px;"><br>
                <button type="submit" style="padding:10px 20px; background:#00f2fe; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Giriş Yap</button>
            </form>
        </body>
    `);
});

app.post('/login', (req, res) => {
    if (req.body.username === 'bonecan123321') {
        req.session.username = 'bonecan123321';
        return res.redirect('/admin');
    }
    res.send('Hatalı kullanıcı adı! Sadece yetkili kurucu erişebilir.');
});

// 4. Admin Yönetim Paneli
app.get('/admin', isAdmin, async (req, res) => {
    const categories = await Category.find();
    const scripts = await Script.find().populate('category');
    res.render('admin', { categories, scripts });
});

// 5. Yeni Kategori Ekleme API
app.post('/admin/category', isAdmin, async (req, res) => {
    try {
        await Category.create({ name: req.body.name });
        res.redirect('/admin');
    } catch (err) {
        res.send('Bu kategori zaten eklenmiş.');
    }
});

// 6. Yeni Script Ekleme API (URL Tabanlı Resim)
app.post('/admin/script', isAdmin, async (req, res) => {
    try {
        await Script.create({
            title: req.body.title,
            description: req.body.description,
            code: req.body.code,
            category: req.body.category,
            image: req.body.image // Direkt yapıştırılan URL kaydediliyor
        });
        res.redirect('/admin');
    } catch (err) {
        res.send('Script eklenirken bir teknik hata oluştu.');
    }
});

// Vercel Serverless Yapısı ve Yerel Test Ayarı
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Sunucu http://localhost:3000 adresinde aktif!'));
}

module.exports = app;

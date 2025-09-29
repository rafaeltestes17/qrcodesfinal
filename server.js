const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------
// Middleware
// --------------------------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'segredo-museu',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// --------------------------
// Configuração do multer
// --------------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --------------------------
// Middleware de autenticação
// --------------------------
function autenticar(req, res, next) {
    if (req.session && req.session.logado) next();
    else res.redirect('/login.html');
}

// --------------------------
// Redirecionamento da raiz para login
// --------------------------
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// --------------------------
// Login e logout
// --------------------------
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'adminserpa' && password === 'Serpamodal07') {
        req.session.logado = true;
        res.json({ success: true });
    } else res.json({ success: false, error: 'Credenciais inválidas' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// --------------------------
// Páginas protegidas
// --------------------------
app.get('/gestor.html', autenticar, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gestor.html'));
});

app.get('/index.html', autenticar, (req, res) => {
    if (!req.query.id) {
        return res.status(400).send('ID do QR Code não especificado!');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------------------
// Rotas de QR Code e arquivos
// --------------------------
app.get('/api/files/:id', (req, res) => {
    const id = req.params.id;
    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    const qrData = data[id] || { descricao: '', arquivos: [], qrImage: '' };
    res.json(qrData);
});

app.post('/api/files/:id', (req, res) => {
    const id = req.params.id;
    const { descricao, qrImage, arquivos } = req.body;
    if (!Array.isArray(arquivos)) return res.status(400).json({ error: 'arquivos precisa ser um array' });

    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    if (!data[id]) data[id] = { descricao: '', qrImage: '', arquivos: [] };
    data[id].descricao = descricao || '';
    data[id].qrImage = qrImage || '';
    data[id].arquivos = arquivos;

    fs.writeFileSync('audios.json', JSON.stringify(data, null, 2));
    res.json({ success: true, ...data[id] });
});

// --------------------------
// Upload de arquivos genéricos
const allowedTypes = ['audio', 'video', 'image', 'pdf'];

app.post('/upload-file', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const id = req.body.id;
    if (!id) return res.status(400).json({ error: 'ID do QR Code não fornecido' });

    const mime = req.file.mimetype;
    const tipo = mime.startsWith('audio') ? 'audio' :
                 mime.startsWith('video') ? 'video' :
                 mime.startsWith('image') ? 'image' :
                 mime === 'application/pdf' ? 'pdf' : 'outro';

    if (!allowedTypes.includes(tipo)) return res.status(400).json({ error: 'Tipo de arquivo não permitido' });

    const fileUrl = `/uploads/${req.file.filename}`;

    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    if (!data[id]) data[id] = { descricao: '', qrImage: '', arquivos: [] };
    if (!Array.isArray(data[id].arquivos)) data[id].arquivos = [];
    data[id].arquivos.push({ tipo, url: fileUrl, nome: req.file.originalname });

    fs.writeFileSync('audios.json', JSON.stringify(data, null, 2));
    res.json({ success: true, file: { tipo, url: fileUrl, nome: req.file.originalname } });
});

// --------------------------
// Upload QR Code
// --------------------------
app.post('/upload-qr', upload.single('qr'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const id = req.body.id;
    const fileUrl = `/uploads/${req.file.filename}`;

    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    if (!data[id]) data[id] = { descricao: '', qrImage: '', arquivos: [] };
    data[id].qrImage = fileUrl;

    fs.writeFileSync('audios.json', JSON.stringify(data, null, 2));
    res.json({ success: true, url: fileUrl });
});

// --------------------------
// Download QR Code
// --------------------------
app.get('/api/qrcodes/:id/download', (req, res) => {
    const id = req.params.id;
    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    if (!data[id] || !data[id].qrImage) return res.status(404).send('QR code não encontrado');
    const filePath = path.join(__dirname, 'public', data[id].qrImage);
    res.download(filePath, err => { if (err) res.status(500).send('Erro ao baixar o arquivo'); });
});

// --------------------------
// Listar todos os QR Codes
// --------------------------
app.get('/api/qrcodes', (req, res) => {
    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    const qrCodes = Object.keys(data).map(id => ({ id, descricao: data[id].descricao || '' }));
    res.json({ qrCodes });
});

// --------------------------
// Deletar QR Code
// --------------------------
app.delete('/api/qrcodes/:id', (req, res) => {
    const id = req.params.id;
    let data = {};
    try { data = JSON.parse(fs.readFileSync('audios.json', 'utf8')); } catch { data = {}; }

    if (!data[id]) return res.status(404).json({ error: 'QR code não encontrado' });
    delete data[id];
    fs.writeFileSync('audios.json', JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// --------------------------
// Nova rota: Conteúdos de um QR Code para visitantes
// --------------------------
app.get('/api/conteudos/:id', (req, res) => {
    const id = req.params.id;
    let data = {};
    try {
        data = JSON.parse(fs.readFileSync('audios.json', 'utf8'));
    } catch {
        return res.status(500).json({ error: 'Erro ao ler dados' });
    }

    if (!data[id]) return res.json({ descricao: '', audios: [], videos: [], pdfs: [], imagens: [] });

    const arquivos = data[id].arquivos || [];

    // Separar por tipo
    const audios = arquivos.filter(f => f.tipo === 'audio');
    const videos = arquivos.filter(f => f.tipo === 'video');
    const pdfs = arquivos.filter(f => f.tipo === 'pdf');
    const imagens = arquivos.filter(f => f.tipo === 'image');

    res.json({
        descricao: data[id].descricao || '',
        audios,
        videos,
        pdfs,
        imagens
    });
});

// --------------------------
// Arquivos públicos (JS, CSS, uploads) – colocar **após** rotas protegidas
// --------------------------
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------
// Iniciar servidor
// --------------------------
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

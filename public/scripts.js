let currentFiles = [];
let originalFiles = [];
let currentDescricao = '';
let originalDescricao = '';
let currentQrImage = '';
let originalQrImage = '';

const filesList = document.getElementById('audios-list'); 
const qrDescricaoInput = document.getElementById('qr-descricao');
const uploadInput = document.getElementById('upload-audio'); 
const uploadBtn = document.getElementById('upload-btn');
const uploadQRInput = document.getElementById('upload-qr');
const uploadQRBtn = document.getElementById('upload-qr-btn');
const qrImageLink = document.getElementById('qr-image-link');
const viewQrLinkBtn = document.getElementById('view-qr-link');

const saveBtn = document.getElementById('save-btn');
const rejectBtn = document.getElementById('reject-btn');
const backBtn = document.getElementById('back-btn');

// --------------------------
// Pega o ID da URL
// --------------------------
function getQrIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// --------------------------
// Renderiza arquivos
// --------------------------
function renderFiles() {
    filesList.innerHTML = '';
    currentFiles.forEach((file, i) => {
        const li = document.createElement('li');
        li.className = 'audio-card';

        const row = document.createElement('div');
        row.className = 'audio-row';

        // Campo para nome do arquivo
        const input = document.createElement('input');
        input.type = 'text';
        input.value = file.nome || `Arquivo ${i+1}`;
        input.placeholder = 'Nome do arquivo';
        input.addEventListener('input', () => currentFiles[i].nome = input.value);
        row.appendChild(input);

        // Se for áudio ou vídeo, adiciona campo de descrição
        if (file.tipo === 'audio' || file.tipo === 'video') {
        const descInput = document.createElement('input');
        descInput.type = 'text';
        descInput.value = file.descricao || '';
        descInput.placeholder = file.tipo === 'audio' ? 'Descrição do áudio' : 'Descrição do vídeo';
        descInput.addEventListener('input', () => currentFiles[i].descricao = descInput.value);
        row.appendChild(descInput);
    }

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remover';
        removeBtn.classList.add('files-btn');
        removeBtn.onclick = () => { currentFiles.splice(i, 1); renderFiles(); };
        row.appendChild(removeBtn);

        li.appendChild(row);

        const urlSpan = document.createElement('span');
        urlSpan.innerHTML = `<strong>Tipo:</strong> ${file.tipo} - <a href="${file.url}" target="_blank">${file.nome}</a>`;
        li.appendChild(urlSpan);

        filesList.appendChild(li);
    });
}

// --------------------------
// Cria botão Ver QR Code
// --------------------------
function createQrButton(url) {
    qrImageLink.innerHTML = ''; // limpa conteúdo antigo
    if (!url) return;

    const btn = document.createElement('button');
    btn.textContent = 'Ver QR Code';
    btn.classList.add('files-btn'); // mesma classe de estilo que outros botões
    btn.addEventListener('click', () => window.open(url, '_blank'));

    qrImageLink.appendChild(btn);
}

// --------------------------
// Carrega dados do QR code
// --------------------------
function loadQr() {
    const id = getQrIdFromUrl();
    if (!id) return alert('ID do QR Code não especificado!');

    fetch(`/api/files/${id}`)
        .then(r => r.json())
        .then(data => {
            currentFiles = data.arquivos || [];
            originalFiles = JSON.parse(JSON.stringify(currentFiles));

            currentDescricao = data.descricao || '';
            originalDescricao = currentDescricao;

            currentQrImage = data.qrImage || '';
            originalQrImage = currentQrImage;

            qrDescricaoInput.value = currentDescricao;
            createQrButton(currentQrImage);
            renderFiles();
        })
        .catch(e => { console.error(e); alert('Erro ao carregar QR Code'); });
}

// --------------------------
// Upload de qualquer arquivo + barra
// --------------------------

uploadBtn.addEventListener('click', () => {
    const file = uploadInput.files[0];
    if (!file) return alert('Escolha um arquivo');

    // Reset da barra e do status antes de iniciar o upload
    document.getElementById('progressBar').value = 0;
    document.getElementById('status').innerText = '';

    const form = new FormData();
    form.append('file', file);
    form.append('id', getQrIdFromUrl());

    const xhr = new XMLHttpRequest();

    // Atualiza barra de progresso durante o upload
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            document.getElementById('progressBar').value = percent;
            document.getElementById('status').innerText = percent + '%';
        }
    });

    // Quando o upload termina
    xhr.addEventListener('load', () => {
        try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
                if (data.file.tipo === 'audio') data.file.descricao = '';
                currentFiles.push(data.file);
                renderFiles();

                // Reset imediato da barra e do status
                document.getElementById('progressBar').value = 0;
                document.getElementById('status').innerText = '';
                uploadInput.value = '';
            } else {
                document.getElementById('status').innerText = 'Erro no upload: ' + data.error;
            }
        } catch (err) {
            document.getElementById('status').innerText = 'Erro no upload.';
            console.error(err);
        }
    });

    // Erro durante o upload
    xhr.addEventListener('error', () => {
        document.getElementById('status').innerText = 'Erro no upload.';
    });

    xhr.open('POST', '/upload-file');
    xhr.send(form);
});



// --------------------------
// Upload QR Code 
// --------------------------
uploadQRBtn.addEventListener('click', () => {
    const file = uploadQRInput.files[0];
    if (!file) return alert('Escolha uma imagem de QR Code');

    const progressBar = document.getElementById('progressBar');
    const status = document.getElementById('status');

    // Reset inicial
    progressBar.value = 0;
    status.innerText = '';

    const form = new FormData();
    form.append('qr', file);
    form.append('id', getQrIdFromUrl());

    const xhr = new XMLHttpRequest();

    // Simula progresso suave até 90%
    let fakeProgress = 0;
    const fakeInterval = setInterval(() => {
        if (fakeProgress < 90) {
            fakeProgress += 1;
            progressBar.value = fakeProgress;
            status.innerText = fakeProgress + '%';
        }
    }, 15);

    // Progresso real
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.value = percent;
            status.innerText = percent + '%';
        }
    });

    xhr.addEventListener('load', () => {
        clearInterval(fakeInterval); // para animação fake

        try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
                currentQrImage = data.url;
                createQrButton(data.url);

                // Finaliza a barra até 100% rapidamente
                progressBar.value = 100;
                status.innerText = 'Upload concluído!';

                // Reset imediato para próximo upload
                setTimeout(() => {
                    progressBar.value = 0;
                    status.innerText = '';
                    uploadQRInput.value = '';
                }, 300); // flash de 0,3s
            } else {
                status.innerText = 'Erro no upload QR Code: ' + data.error;
            }
        } catch (err) {
            status.innerText = 'Erro no upload QR Code.';
            console.error(err);
        }
    });

    xhr.addEventListener('error', () => {
        clearInterval(fakeInterval);
        status.innerText = 'Erro no upload QR Code.';
    });

    xhr.open('POST', '/upload-qr');
    xhr.send(form);
});



// --------------------------
// Consultar link do QR Code
// --------------------------
viewQrLinkBtn.addEventListener('click', () => {
    const id = getQrIdFromUrl();
    if (!id) return alert('ID do QR Code não especificado!');
    window.open(`/qrcode.html?id=${id}`, '_blank');
});

// --------------------------
// Salvar alterações
// --------------------------
saveBtn.addEventListener('click', () => {
    const id = getQrIdFromUrl();
    fetch(`/api/files/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arquivos: currentFiles, descricao: qrDescricaoInput.value, qrImage: currentQrImage })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('QR Code atualizado!');
                originalFiles = JSON.parse(JSON.stringify(currentFiles));
                originalDescricao = qrDescricaoInput.value;
                originalQrImage = currentQrImage;
            } else alert('Erro ao salvar');
        }).catch(e => { console.error(e); alert('Erro ao salvar'); });
});

// --------------------------
// Rejeitar alterações
// --------------------------
rejectBtn.addEventListener('click', () => {
    currentFiles = JSON.parse(JSON.stringify(originalFiles));
    currentDescricao = originalDescricao;
    currentQrImage = originalQrImage;

    qrDescricaoInput.value = currentDescricao;
    createQrButton(currentQrImage);
    renderFiles();
});

// --------------------------
// Voltar à listagem
// --------------------------
backBtn.addEventListener('click', () => {
    window.location.href = '/gestor.html';
});

// --------------------------
// Inicializa
// --------------------------
loadQr();

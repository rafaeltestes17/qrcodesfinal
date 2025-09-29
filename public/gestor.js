// --------------------------
// Função para carregar todos os QR codes na tabela
// --------------------------
async function loadQrCodes() {
    try {
        const res = await fetch('/api/qrcodes');
        const data = await res.json();

        const tableBody = document.getElementById('qr-table-body');
        tableBody.innerHTML = '';

        data.qrCodes.forEach(qr => {
            const row = document.createElement('tr');

            // Nome/descrição
            const nameCell = document.createElement('td');
            nameCell.textContent = qr.descricao || `QR Code ${qr.id}`;
            row.appendChild(nameCell);

            // Botão Editar
            const editCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.onclick = () => {
                // Redireciona para index.html com o ID na query string
                window.location.href = `/index.html?id=${qr.id}`;
            };
            editCell.appendChild(editBtn);
            row.appendChild(editCell);

            // Botão Download QR
            const downloadCell = document.createElement('td');
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download QR';
            downloadBtn.onclick = () => downloadQrCode(qr.id);
            downloadCell.appendChild(downloadBtn);
            row.appendChild(downloadCell);

            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
        alert('Erro ao carregar os QR Codes.');
    }
}

// --------------------------
// Função para baixar o QR code
// --------------------------
function downloadQrCode(id) {
    const link = document.createElement('a');
    // Usar a rota do servidor que faz o download real
    link.href = `/api/qrcodes/${id}/download`;
    link.download = `qrcode-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --------------------------
// Inicialização
// --------------------------
loadQrCodes();

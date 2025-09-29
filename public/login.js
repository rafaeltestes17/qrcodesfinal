document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        return alert('Preencha todos os campos.');
    }

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (data.success) {
            // Redireciona para o gestor
            window.location.href = '/gestor.html';
        } else {
            alert('Credenciais inválidas');
        }
    } catch (err) {
        console.error(err);
        alert('Erro na autenticação.');
    }
});

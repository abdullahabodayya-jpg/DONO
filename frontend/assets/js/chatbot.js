document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const closeBtn = document.getElementById('chatbot-close-btn');
    const windowEl = document.getElementById('chatbot-window');
    const formEl = document.getElementById('chatbot-form');
    const inputEl = document.getElementById('chatbot-input');
    const messagesEl = document.getElementById('chatbot-messages');

    if (!toggleBtn || !windowEl || !formEl || !inputEl || !messagesEl) {
        return;
    }

    toggleBtn.addEventListener('click', () => {
        windowEl.classList.toggle('hidden');
        if (!windowEl.classList.contains('hidden')) {
            inputEl.focus();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            windowEl.classList.add('hidden');
        });
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = inputEl.value.trim();
        if (!text) return;

        appendBubble(text, 'user');
        inputEl.value = '';

        const tempId = appendBubble('Searching catalog...', 'bot');

        try {
            const response = await fetch('/dono/backend/public/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            const tempEl = document.getElementById(tempId);
            if (tempEl) tempEl.remove();

            if (data.reply) {
                appendBubble(data.reply, 'bot');
            }

            if (Array.isArray(data.products) && data.products.length > 0) {
                renderProductCards(data.products);
            }
        } catch {
            const tempEl = document.getElementById(tempId);
            if (tempEl) tempEl.remove();
            appendBubble('Could not complete the request. Please try again.', 'bot');
        }
    });

    function appendBubble(message, type) {
        const id = 'chat-msg-' + Date.now();
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;
        bubble.id = id;
        bubble.textContent = message;
        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return id;
    }

    function renderProductCards(products) {
        const container = document.createElement('div');
        container.className = 'chat-cards-container';

        products.forEach((p) => {
            const card = document.createElement('div');
            card.className = 'chat-product-card';

            const img = document.createElement('img');
            img.src = p.main_image || '/frontend/assets/img/default.png';
            img.alt = p.name;

            const info = document.createElement('div');
            info.className = 'chat-product-info';

            const name = document.createElement('span');
            name.className = 'chat-product-name';
            name.textContent = p.name;

            const price = document.createElement('span');
            price.className = 'chat-product-price';
            price.textContent = `$${p.price}`;

            const link = document.createElement('a');
            link.className = 'chat-view-link';
            link.href = `/frontend/product-details.html?id=${p.id}`;
            link.textContent = 'View Product';

            info.appendChild(name);
            info.appendChild(price);
            info.appendChild(link);

            card.appendChild(img);
            card.appendChild(info);
            container.appendChild(card);
        });

        messagesEl.appendChild(container);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
});
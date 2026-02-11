document.addEventListener('DOMContentLoaded', () => {

    // ========================================
    // 1. PARTICLE SYSTEM
    // ========================================
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.hue = Math.random() > 0.5 ? 217 : 330; // blue or pink
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            // Wrap around edges
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }
    initParticles();

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(100, 150, 255, ${0.08 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        drawLines();
        animationId = requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // ========================================
    // 2. TYPING EFFECT
    // ========================================
    const phrases = [
        'The Ultimate Utility Suite for Professional Botters',
        'Split IDs, Cookies, and Combos in Seconds',
        'Fast. Free. No Ads. No Limits.',
        'Built for Speed and Simplicity'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingEl = document.getElementById('typingText');
    const typingSpeed = 50;
    const deletingSpeed = 30;
    const pauseAfterType = 2000;
    const pauseAfterDelete = 500;

    function type() {
        const currentPhrase = phrases[phraseIndex];
        if (!isDeleting) {
            typingEl.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            if (charIndex === currentPhrase.length) {
                isDeleting = true;
                setTimeout(type, pauseAfterType);
                return;
            }
            setTimeout(type, typingSpeed);
        } else {
            typingEl.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                setTimeout(type, pauseAfterDelete);
                return;
            }
            setTimeout(type, deletingSpeed);
        }
    }
    setTimeout(type, 1000);

    // ========================================
    // 3. MOUSE-TRACKING CARD GLOW + 3D TILT
    // ========================================
    document.querySelectorAll('.feature-card-wrapper').forEach(wrapper => {
        const innerCard = wrapper.querySelector('.feature-card');

        wrapper.addEventListener('mousemove', (e) => {
            const rect = wrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Mouse-tracking glow
            innerCard.style.setProperty('--mouse-x', `${x}px`);
            innerCard.style.setProperty('--mouse-y', `${y}px`);

            // 3D Tilt effect
            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;
            wrapper.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        wrapper.addEventListener('mouseleave', () => {
            wrapper.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
        });
    });

    // ========================================
    // 4. STATS COUNTER ANIMATION
    // ========================================
    const statNumbers = document.querySelectorAll('.stat-number');
    const observerOptions = { threshold: 0.5 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, observerOptions);

    statNumbers.forEach(el => observer.observe(el));

    function animateCounter(el, target) {
        let current = 0;
        const duration = 1500;
        const step = target / (duration / 16);
        function update() {
            current += step;
            if (current >= target) {
                el.textContent = target;
                return;
            }
            el.textContent = Math.floor(current);
            requestAnimationFrame(update);
        }
        update();
    }

    // ========================================
    // 5. STAGGER CARD ENTRANCE
    // ========================================
    const wrappers = document.querySelectorAll('.feature-card-wrapper');
    wrappers.forEach((w, i) => {
        w.style.animationDelay = `${0.3 + i * 0.2}s`;
        w.style.transition = 'transform 0.3s ease-out';
    });
});

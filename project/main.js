// 1. 定义需要加载的所有小组件
async function loadComponents() {
    const components =[
        { id: 'nav-placeholder', url: 'components/nav.html' },
        { id: 'hero-placeholder', url: 'components/hero.html' },
        { id: 'motivation-placeholder', url: 'components/motivation.html' },
        { id: 'research-placeholder', url: 'components/research.html' },
        { id: 'review-placeholder', url: 'components/review.html' },
        { id: 'personas-placeholder', url: 'components/personas.html' },
        { id: 'journey-placeholder', url: 'components/journey.html' },       
        { id: 'requirements-placeholder', url: 'components/requirements.html' },
        { id: 'ideation-placeholder', url: 'components/ideation.html' },
        { id: 'prototype-placeholder', url: 'components/prototype.html' },
        { id: 'evaluation-placeholder', url: 'components/evaluation.html' },
        { id: 'team-placeholder', url: 'components/team.html' },
        { id: 'footer-placeholder', url: 'components/footer.html' }
    ];

    // 2. 将它们拼接到网页中
    for (let comp of components) {
        try {
            const response = await fetch(comp.url);
            const html = await response.text();
            document.getElementById(comp.id).innerHTML = html;
        } catch (error) {
            console.error(`组件 ${comp.url} 加载失败:`, error);
        }
    }

    // 3. 所有内容拼接完成后，激活原有的所有动画！
    initInteractions();
}

// 存放你原有的所有脚本逻辑
function initInteractions() {
    // Reveal on Scroll Observer
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Stats Animation
    function animateStats() {
        const counters = document.querySelectorAll('.counter');
        const bars = document.querySelectorAll('.progress-bar');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            let current = 0;
            const duration = 2000;
            const stepTime = 20;
            const increment = target / (duration / stepTime);
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.innerText = target + "%";
                    clearInterval(timer);
                } else {
                    counter.innerText = Math.floor(current) + "%";
                }
            }, stepTime);
        });
        
        bars.forEach(bar => {
            const width = bar.getAttribute('data-width');
            bar.getBoundingClientRect();
            bar.style.width = width;
        });
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    const statsTrigger = document.getElementById('stats-trigger');
    if (statsTrigger) statsObserver.observe(statsTrigger);

    // Typing Effect
    function typeEffect(element, text, speed = 50) {
        let i = 0;
        element.innerText = "";
        function type() {
            if (i < text.length) {
                element.innerText += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    const prototypeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const aiTyping = document.getElementById('ai-typing');
                if (aiTyping) {
                    const originalText = aiTyping.innerText;
                    typeEffect(aiTyping, originalText);
                }
                prototypeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    const prototypeSection = document.getElementById('prototype');
    if (prototypeSection) prototypeObserver.observe(prototypeSection);

    // Smooth Scroll for Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (nav) {
            if (window.scrollY > 50) {
                nav.classList.add('py-3', 'bg-[#121d33]/90', 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]');
                nav.classList.remove('py-4');
            } else {
                nav.classList.remove('py-3', 'bg-[#121d33]/90', 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]');
                nav.classList.add('py-4');
            }
        }
    });
}

// 启动引擎
loadComponents();
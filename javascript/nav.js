const logoLink = document.querySelector('.nav-logo-link');
const scrollContainer = document.querySelector('.page-scroll');

if (logoLink && scrollContainer) {
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        scrollContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

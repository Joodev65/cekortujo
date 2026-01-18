// Menu & theme toggle + small adjustments for pixel match
document.addEventListener('DOMContentLoaded', () => {
  const btnMenu = document.getElementById('btnMenu');
  const side = document.getElementById('sideMenu');
  const btnTheme = document.getElementById('btnTheme');

  btnMenu && btnMenu.addEventListener('click', () => {
    const visible = side.getAttribute('aria-hidden') === 'false';
    side.style.display = visible ? 'none' : 'block';
    side.setAttribute('aria-hidden', visible ? 'true' : 'false');
  });

  btnTheme && btnTheme.addEventListener('click', () => {
    // simple color swap to simulate light/dark (kept, but screenshot is dark)
    document.body.classList.toggle('theme-light');
    if (document.body.classList.contains('theme-light')) {
      document.documentElement.style.setProperty('--bg','#f6f7f9');
      document.documentElement.style.setProperty('--card','#ffffff');
      document.documentElement.style.setProperty('--muted','#6b6f76');
      document.documentElement.style.setProperty('--accent','#111217');
      document.documentElement.style.setProperty('--chip','#efefef');
      document.documentElement.style.setProperty('--badge','#efefef');
      document.documentElement.style.setProperty('--glass-border','rgba(0,0,0,0.06)');
    } else {
      document.documentElement.style.setProperty('--bg','#0b0b0b');
      document.documentElement.style.setProperty('--card','#1a1a1a');
      document.documentElement.style.setProperty('--muted','#9b9ea1');
      document.documentElement.style.setProperty('--accent','#e6e6e6');
      document.documentElement.style.setProperty('--chip','#232323');
      document.documentElement.style.setProperty('--badge','#262626');
      document.documentElement.style.setProperty('--glass-border','rgba(255,255,255,0.025)');
    }
  });
});
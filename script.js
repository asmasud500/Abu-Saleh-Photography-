const menuButton=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');

if(menuButton&&nav){
  menuButton.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded',String(open));
    menuButton.textContent=open?'Close':'Menu';
  });
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded','false');
    menuButton.textContent='Menu';
  }));
}

document.getElementById('year').textContent=new Date().getFullYear();

const filters=document.querySelectorAll('.filter');
const galleryItems=document.querySelectorAll('.gallery-item');
filters.forEach(button=>button.addEventListener('click',()=>{
  filters.forEach(item=>item.classList.remove('active'));
  button.classList.add('active');
  const selected=button.dataset.filter;
  galleryItems.forEach(item=>{
    item.classList.toggle('is-hidden',selected!=='all'&&item.dataset.category!==selected);
  });
}));

const lightbox=document.querySelector('.lightbox');
const lightboxImage=document.querySelector('.lightbox-image');
const lightboxCaption=document.querySelector('.lightbox-caption');
const lightboxClose=document.querySelector('.lightbox-close');

function closeLightbox(){
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden','true');
  document.body.classList.remove('no-scroll');
  lightboxImage.removeAttribute('src');
}

galleryItems.forEach(item=>item.addEventListener('click',()=>{
  const image=item.querySelector('img');
  if(!image)return;
  lightboxImage.src=image.src;
  lightboxImage.alt=image.alt;
  lightboxCaption.textContent=`${item.dataset.title||'Photography'} · Free source: Unsplash`;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden','false');
  document.body.classList.add('no-scroll');
  lightboxClose.focus();
}));

lightboxClose.addEventListener('click',closeLightbox);
lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&lightbox.classList.contains('open'))closeLightbox();});

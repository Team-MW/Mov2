async function checkImage() {
  const url = 'https://rlqesmyifbqfbblttrhl.supabase.co/storage/v1/object/public/medias/promos/promo-marchedemo.webp';
  const renderUrl = 'https://rlqesmyifbqfbblttrhl.supabase.co/storage/v1/render/image/public/medias/promos/promo-marchedemo.webp?width=1200&quality=75&format=webp';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Original image response status:', res.status);
    
    const resRender = await fetch(renderUrl, { method: 'HEAD' });
    console.log('Render (transformed) image response status:', resRender.status);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
checkImage();

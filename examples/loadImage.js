const imageSrc = 'https://www.themealdb.com/images/ingredients/Lime.png';

function loadImage(src, callback) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = '公众号若川视野专用图？';
    image.style = 'width: 200px;height: 200px';
    image.onload = () => callback(null, image);
    image.onerror = () => callback(new Error('加载失败'));
    document.body.append(image);
}

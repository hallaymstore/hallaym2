# HALLAYM Studio

HALLAYM IT xizmatlari va loyihalari katalogi. Node.js/Express backend, MongoDB Atlas katalogi, MongoDB GridFS rasmlar, mobil pastki navigatsiya va parol bilan himoyalangan tahrirlash paneli.

## Ishga tushirish

```sh
npm ci
cp .env.example .env
# .env ichida Mongo URI, ADMIN_PASSWORD va SESSION_SECRET ni belgilang
npm start
```

`http://localhost:3000` — sayt; pastdagi **Boshqaruv** — katalogni tahrirlash. Birinchi Mongo ulanishda tasdiqlangan boshlang‘ich loyihalar avtomatik qo‘shiladi. `MONGO_DB` alohida bazaga mo‘ljallangan, shuning uchun mavjud Atlas klasteridan foydalansangiz ham boshqa ilova ma’lumotlariga tegilmaydi.

Mongo ulanmaguncha ommaviy katalog namuna ma’lumotlar bilan o‘qish rejimida ishlaydi; admin yozish va rasm yuklash Mongo ulanishini talab qiladi. Tasvirlar MongoDB GridFS da saqlanadi va deploydan keyin ham qoladi. `ADMIN_PASSWORD` va `SESSION_SECRET` hech qachon repoga kiritilmaydi.

## Render

Node runtime, `npm ci`, `npm start`, health check `/api/healthz`. Environment: `MONGO_URI`, `MONGO_DB=hallaym_portfolio`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Domain uchun Render servisga `hallaym.com` va kerak bo‘lsa `www.hallaym.com` qo‘shib, ko‘rsatilgan DNS yozuvlarini domen provayderida yangilang. Oldingi xizmatga bog‘langan DNS yozuvlari bo‘lsa, yangi xizmat tekshirilmaguncha ularni o‘zgartirmang.

## Admin

Loyihani qo‘shish/tahrirlash/o‘chirish, kategoriya, muallif, buyurtmachi, tavsif, texnologiyalar, demo va kod manzili, muqova URL yoki 5 MB gacha PNG/JPG/WEBP yuklash; jamoa a’zolarini qo‘shish/tahrirlash/o‘chirish. Maxsus sessiya cookie 12 soat. Havolalar faqat `https:` yoki `http:` bo‘lishi mumkin.

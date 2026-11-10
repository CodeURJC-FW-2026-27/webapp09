const express = require('express');
const mustacheExpress = require('mustache-express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const computers = [
    {
        id: 1,
        name: 'Gaming PC',
        description: 'High-performance gaming computer.',
        price: '€2000.00',
        image: '/images/pcgaming.png',
        brand: 'Custom Build',
        type: 'High-End Computer',
        releaseDate: '2026-09-01',
        used: false
    },
    {
        id: 2,
        name: 'Office PC',
        description: 'Reliable computer for office tasks.',
        price: '€150.00',
        image: '/images/Captura de pantalla 2026-10-12 125445(2).png',
        brand: 'Office Pro',
        type: 'Low-End Computer',
        releaseDate: '2025-11-15',
        used: true
    },
    {
        id: 3,
        name: 'Creator PC',
        description: 'Oriented towards content creation.',
        price: '€1599.99',
        image: 'https://www.csl-computer.com/es/media/catalog/product/cache/7/image/3000x3000/9df78eab33525d08d6e5fb8d27136e95/8/9/89244---bb-mini-pc-csl-venombox-hs_01_3000px_18.webp',
        brand: 'Creator Studio',
        type: 'Modern Computer',
        releaseDate: '2026-01-20',
        used: false
    },
    {
        id: 4,
        name: 'Budget PC',
        description: 'Cheaper option for basic tasks.',
        price: '€29.99',
        image: '/images/360_F_81271153_z1nD0djpmAU1YjDurPSaUnrJZ8hV1O1r.jpg',
        brand: 'Budget Tech',
        type: 'Low-End Computer',
        releaseDate: '2024-08-22',
        used: false
    },
    {
        id: 5,
        name: 'Workstation PC',
        description: 'High-performance machine with advanced features.',
        price: '€199.99',
        image: 'https://cerebriti.b-cdn.net/uploads/FB_4ca608cd357efac71373eb399589f0f5.jpg',
        brand: 'Workstation X',
        type: 'Modern Computer',
        releaseDate: '2026-06-16',
        used: true
    },
    {
        id: 6,
        name: 'Mini PC',
        description: 'Compact for travel and space-saving.',
        price: '€699.99',
        image: 'https://img.directindustry.es/images_di/photo-m2/240602-16959869.jpg',
        brand: 'MiniMax',
        type: 'Modern Computer',
        releaseDate: '2025-12-03',
        used: false
    },
    {
        id: 7,
        name: 'High-End PC',
        description: 'The most powerful option in the market.',
        price: '€2499.99',
        image: '/images/images(1).jpg',
        brand: 'Elite Range',
        type: 'High-End Computer',
        releaseDate: '2026-10-10',
        used: false
    },
    {
        id: 9,
        name: 'All-in-One PC',
        description: 'Integrated design for a clean workspace.',
        price: '€499.99',
        image: 'https://cerebriti.b-cdn.net/uploads/FB_b9064dd5b1ed42a941322e0b9a9e3af4.jpg',
        brand: 'AllInOne',
        type: 'Modern Computer',
        releaseDate: '2026-02-11',
        used: false
    },
    {
        id: 10,
        name: 'Custom PC',
        description: 'Tailored to your specific needs and preferences.',
        price: '€1299.99',
        image: '/images/Captura de pantalla 2026-10-11 101249.png',
        brand: 'Custom Build',
        type: 'High-End Computer',
        releaseDate: '2026-07-18',
        used: true
    }
];

const components = [
    { name: 'AMD Ryzen 7 7800X3D', type: 'CPU', image: 'https://www.gsmpro.cl/cdn/shop/files/procesador-amd-ryzen-7-7800x3d-7.webp?v=1775234196&width=1200' },
    { name: 'GeForce RTX 5070', type: 'GPU', image: 'https://multimedia.bbycastatic.ca/multimedia/products/1500x1500/191/19193/19193219_2.jpg' },
    { name: 'B650 Gaming Plus WiFi', type: 'Motherboard', image: 'https://asset-us-store.msi.com/image/cache/catalog/Pd_page/Motherboard/B650TOMAHAWKWIFI/B650TOMAHAWKWIFI-1-1024x1024.png' },
    { name: 'Vengeance 32 GB DDR5', type: 'RAM', image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/693901/large/Kit-De-Mem-ria-Para-PC-Corsair-Vengeance-32gb-6000mhz-2x16gb-Ddr5-Cmk32gx5m2e6000c36-5823-_1762281527.webp' },
    { name: '990 EVO 1 TB', type: 'Storage', image: 'https://cdn.atacadoconnect.com/produtos/1245967/ssd-m-2-samsung-990-evo-plus-1tb-nvme-pcie-gen-4-mz-v9s1t0b-am-1245967-96105.webp' },
    { name: 'RM750e 750 W', type: 'PSU', image: 'https://assets.corsair.com/image/upload/c_pad%2Cq_85%2Ch_1100%2Cw_1100%2Cf_auto/products/Power-Supply-Units/CP-9020195-WW/Gallery/RM750_01.webp' },
    { name: '4000D Airflow', type: 'Case', image: 'https://lcdi.fr/cdn/shop/files/corsair-4000d-airflow-noir.jpg?v=1745245056' },
    { name: 'Peerless Assassin 120 SE', type: 'Cooling System', image: 'https://fly.bg/uploads/products/as/deepcool_ak400_cpu_air_cooler_1x120mm_pwm_fan_tdp_gwx9n.jpg' }
];

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/CSS', express.static(path.join(__dirname, 'CSS')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/', (req, res) => {
    res.render('index', { computers });
});

app.get('/Index.html', (req, res) => {
    res.render('index', { computers });
});

app.get('/create', (req, res) => {
    res.render('create');
});

app.get('/create.html', (req, res) => {
    res.render('create');
});

app.get('/details', (req, res) => {
    const id = Number(req.query.id || 1);
    const computer = computers.find(item => item.id === id) || computers[0];
    res.render('details', { computer, components });
});

app.get('/details/:id', (req, res) => {
    const id = Number(req.params.id);
    const computer = computers.find(item => item.id === id) || computers[0];
    res.render('details', { computer, components });
});

app.get('/details.html', (req, res) => {
    const id = Number(req.query.id || 1);
    const computer = computers.find(item => item.id === id) || computers[0];
    res.render('details', { computer, components });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

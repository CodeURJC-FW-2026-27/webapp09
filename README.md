# PC Parts Catalog

**Web Fundamentals · 2nd year, Software Engineering · Academic year 2026–2027**

PC Parts Catalog is a server-side web application to browse and manage computer builds and the hardware components that make them up. Users can search computers by name, filter them by category, browse a paginated catalog, and create, edit and delete both computers and components, including their images.

Built with **Node.js**, **Express**, **Mustache** templates, **Bootstrap 5** and **MongoDB**.

## Table of contents

1. [Team](#team)
2. [Functionality](#functionality)
3. [Practice 1 — HTML and CSS layout](#practice-1--html-and-css-layout)
4. [Practice 2 — Node.js and MongoDB](#practice-2--nodejs-and-mongodb)
   - [Application screenshots](#application-screenshots)
   - [Routes](#routes)
   - [Validation rules](#validation-rules)
   - [Project structure and file descriptions](#project-structure-and-file-descriptions)
   - [Demo script](#demo-script)
   - [Demo video](#demo-video)
   - [Team participation](#team-participation)
5. [License](#license)

## Team

| Name | University email | GitHub |
| --- | --- | --- |
| **Pablo Montes Gilete** | [p.montes.2025@alumnos.urjc.es](mailto:p.montes.2025@alumnos.urjc.es) | [pMOGI134](https://github.com/pMOGI134) |
| **Yoel Alejandro Adán González** | [ya.adan.2025@alumnos.urjc.es](mailto:ya.adan.2025@alumnos.urjc.es) | [yoelaleadan-wq](https://github.com/yoelaleadan-wq) |
| **Alvaro Pastrana Lopez** | [a.pastrana.2025@alumnos.urjc.es](mailto:a.pastrana.2025@alumnos.urjc.es) | [pastranalvaro30-png](https://github.com/pastranalvaro30-png) |

Repository: <https://github.com/CodeURJC-FW-2026-27/webapp09>

## Functionality

### Entities

The application manages two entities stored in MongoDB.

**Computer** (main entity) represents a complete computer build.

| Attribute | Description |
| --- | --- |
| `name` | Name of the computer. Unique, starts with an uppercase letter |
| `brand` | Manufacturer |
| `type` | Category: `High-End Computer`, `Modern Computer` or `Low-End Computer` |
| `description` | Description of the computer (10 to 2000 characters) |
| `price` | Price in euros |
| `releaseDate` | Release date |
| `used` | Whether the computer is second-hand |
| `image` | Image of the computer (uploaded from the browser) |

**Component** (secondary entity) is a hardware part that belongs to one computer.

| Attribute | Description |
| --- | --- |
| `name` | Name of the component. Unique within its computer, starts with an uppercase letter |
| `brand` | Manufacturer |
| `type` | Category: `CPU`, `GPU`, `Motherboard`, `RAM`, `Storage`, `PSU`, `Case` or `Cooling System` |
| `description` | Description of the component (10 to 2000 characters) |
| `price` | Price in euros |
| `image` | Image of the component |
| `computerId` | Reference to the computer it belongs to |

Each computer can have many components (**one-to-many**). Deleting a computer also deletes its components.

```text
Apex Gaming Tower
├── CPU          → Ryzen Gaming Processor
└── GPU          → GeForce Gaming Graphics
```

### Images

Both computers and components have an image. Images are uploaded from the browser (PNG, JPEG or WebP, up to 5 MB), stored in the `uploads/` folder and shown in the catalog and in the detail pages. When an item is edited without selecting a new image, its previous image is kept.

### Search and categorization

- **Search:** a text box on the main page returns the computers whose name contains the typed text (case-insensitive).
- **Categorization:** the computers can be filtered by type (High-End, Modern or Low-End). Search and filter can be combined and are preserved while paginating.
- **Pagination:** the catalog shows 6 computers per page, with links to each page and to the previous and next pages.

## Practice 1 — HTML and CSS layout

Static layout of the main page, the detail page and the new-element page, built with HTML, CSS and Bootstrap.

### Contributions

| Member | Contributions |
| --- | --- |
| **Pablo Montes Gilete** | Structure of `index.html`, Bootstrap integration and general structure of the site |
| **Yoel Alejandro Adán González** | Creation of `details.html` and fixes to `Style.css` |
| **Alvaro Pastrana Lopez** | Creation of `create.html`, descriptions and photos of `index.html`, and design of the header and footer |

### Most relevant commits

**Pablo Montes Gilete**

- [`4703624`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/4703624ef1dcd1c8011cf4c450d8266ddf701779) — Creation of the index.html
- [`4066ba6`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/4066ba6d874f0847faaeefc2acb7383a9d4c6bb3) — Added search bar
- [`295ce02`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/295ce02cef85f80d5d45276310f42b70fc763028) — Added icon and some photos
- [`7f09139`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/7f09139baa02075837b34adc252ccc563c1b1a46) — Added the Bootstrap design

**Yoel Alejandro Adán González**

- [`e080fdc`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/e080fdca97f84c66572ab6896ef6c75efe48235e) — Creation of the details.html
- [`7c16fe6`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/7c16fe66f39907008ae4ae3cd78935cf7d154d52) — Add "View Details" links for each PC and create a new HTML file to create a PC
- [`e897baa`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/e897baa954feb75c88d026fd8742f55e5d4c7b87) — Modified the structure of the divs, created images of the first PC
- [`22f01c5`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/22f01c5583056d52d2798e1a0889e624a8232b20) — Enhance details page with component cards

**Alvaro Pastrana Lopez**

- [`ddd86c6`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/ddd86c65d63b893ffa977e723d4db0b23810919f) — Added PC descriptions
- [`0951881`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/09518818507e6646f93209d06474df7346c2ecfe) — Creation of the create.html
- [`9cdb552`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/9cdb55244c51db15ed8357c50962148b9a2ae74f) — Remade the whole create page
- [`ba1583e`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/ba1583e2c40160ed35ac9ac07a65fbb7fe300f58) — Fixed the footer on create

### Screenshots

<img width="720" alt="Practice 1: main page" src="https://github.com/user-attachments/assets/61ffa42c-a9fa-45bc-8359-48da10760d8a" />
<img width="720" alt="Practice 1: main page, grid" src="https://github.com/user-attachments/assets/0079595f-551f-49f8-b5e8-021dd9bf25b5" />
<img width="720" alt="Practice 1: detail page" src="https://github.com/user-attachments/assets/3df77e66-47ab-45a4-9bee-6acdb1bbc3d0" />
<img width="720" alt="Practice 1: detail page, components" src="https://github.com/user-attachments/assets/91fe6b3f-1d75-4cfd-a53b-690d4a4c781e" />
<img width="720" alt="Practice 1: new computer page" src="https://github.com/user-attachments/assets/3c7f74b3-00aa-4cae-8378-a4b1b72b38e5" />
<img width="720" alt="Practice 1: new computer page, form" src="https://github.com/user-attachments/assets/511190b5-b33b-4c58-8fd7-7a60cf7f4d37" />
<img width="720" alt="Practice 1: responsive layout" src="https://github.com/user-attachments/assets/09334f83-2f08-433f-adf9-afe2eabe85bc" />
<img width="720" alt="Practice 1: footer" src="https://github.com/user-attachments/assets/e2d55761-4b43-4878-a466-c08889cad2cd" />

## Practice 2 — Node.js and MongoDB

The application is fully functional on the server side: data lives in MongoDB, images in `uploads/`, and pages are rendered with Mustache templates that share a common header and footer through partials.


### Application screenshots

| Catalog with pagination | Search and category filter |
| --- | --- |
| ![Catalog](docs/screenshots/catalog.png) | ![Search and filter](docs/screenshots/search-filter.png) |

| Computer detail with components | Create / edit computer |
| --- | --- |
| ![Computer detail](docs/screenshots/computer-detail.png) | ![Computer form](docs/screenshots/computer-form.png) |

| Validation error page | Confirmation page |
| --- | --- |
| ![Validation error](docs/screenshots/validation-error.png) | ![Confirmation](docs/screenshots/confirmation.png) |

| Component detail | Create / edit component |
| --- | --- |
| ![Component detail](docs/screenshots/component-detail.png) | ![Component form](docs/screenshots/component-form.png) |

### Routes

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/computers?q=&type=&page=` | Paginated catalog with search and category filter |
| `GET` | `/computers/new` | Form to create a computer |
| `POST` | `/computers` | Create a computer |
| `GET` | `/computers/:id` | Computer detail with its components |
| `GET` | `/computers/:id/edit` | Form to edit a computer |
| `POST` | `/computers/:id/edit` | Update a computer |
| `POST` | `/computers/:id/delete` | Delete a computer and its components |
| `GET` | `/computers/:computerId/components/new` | Form to add a component |
| `POST` | `/computers/:computerId/components` | Create a component |
| `GET` | `/computers/:computerId/components/:componentId` | Component detail |
| `GET` | `/computers/:computerId/components/:componentId/edit` | Form to edit a component |
| `POST` | `/computers/:computerId/components/:componentId/edit` | Update a component |
| `POST` | `/computers/:computerId/components/:componentId/delete` | Delete a component |
| `GET` | `/uploads/:filename` | Serve an uploaded image |

### Validation rules

The browser validates every field it can with HTML attributes. The server repeats **all** validations, so invalid data is rejected even if the browser checks are removed. Any error is shown on a dedicated error page with a message and a button that goes back to the right form.

| Field | Rule |
| --- | --- |
| Name | Required, up to 100 characters, starts with an uppercase letter. Unique among computers; unique within a computer for components (case-insensitive) |
| Brand | Required, up to 100 characters |
| Type | One of the listed categories |
| Description | Between 10 and 2000 characters |
| Price | Non-negative number with up to two decimals |
| Release date | Valid calendar date (computers) |
| Used | Boolean (computers) |
| Image | PNG, JPEG or WebP, up to 5 MB. The file content is checked, not only its declared type |

### Project structure and file descriptions

```text
webapp09/
├── data/                       Sample images copied to uploads/ on first start
├── public/
│   ├── css/Style.css
│   └── images/                 Static images (favicon, fallback image)
├── src/
│   ├── app.js
│   ├── config/catalog.js
│   ├── database/
│   │   ├── pc-parts-db.js
│   │   └── seed-if-empty.js
│   ├── lib/
│   │   ├── catalog.js
│   │   ├── http.js
│   │   ├── images.js
│   │   └── validation.js
│   ├── computers/computer.routes.js
│   └── components/component.routes.js
├── views/
│   ├── partials/               Shared header and footer
│   └── pc-parts/               Page templates
├── uploads/                    Uploaded images (created at runtime, not in Git)
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

| File | Responsibility |
| --- | --- |
| `src/app.js` | Creates the Express app, configures Mustache, static files and routers, handles 404 and unexpected errors, connects to MongoDB, seeds the data and starts the server |
| `src/config/catalog.js` | Categories, page size and validation limits |
| `src/database/pc-parts-db.js` | Connects once to MongoDB and exposes the `computers` and `components` collections |
| `src/database/seed-if-empty.js` | Inserts the example computers and components and copies `data/` images to `uploads/` when the database is empty |
| `src/lib/validation.js` | Server-side validation of computers and components, and helpers for name-duplicate and search filters |
| `src/lib/images.js` | Image upload with multer, content check, random stored names, serving, and removal of unused images |
| `src/lib/http.js` | Helpers that render the confirmation and error pages and check the database connection |
| `src/lib/catalog.js` | Shared lookup (computer by ID) and presentation of documents for the views |
| `src/computers/computer.routes.js` | Catalog listing with search, filter and pagination, plus computer detail, create, edit and delete |
| `src/components/component.routes.js` | Component detail, create, edit and delete, always scoped to a computer |
| `views/partials/header.mustache`, `footer.mustache` | Header with navigation and footer, reused by every page |
| `views/pc-parts/index.mustache` | Main page: search form, category filter, grid and pagination |
| `views/pc-parts/details.mustache` | Computer detail page with its components |
| `views/pc-parts/create.mustache` | Computer form, reused for creating and editing |
| `views/pc-parts/components/create.mustache` | Component form, reused for creating and editing |
| `views/pc-parts/components/details.mustache` | Component detail page |
| `views/pc-parts/confirmation.mustache` | Confirmation page for created, updated and deleted items |
| `views/pc-parts/error.mustache` | Error page for form errors and other failures |
| `public/css/Style.css` | Site styles |

### Demo script

1. Open `/computers`: show the first page of the catalog and go to page 2 with the pagination links.
2. Search by a computer name, then clear the search.
3. Filter by a computer type.
4. Open a computer and show its image, its data (the URL contains its ID) and its components.
5. Create a computer with valid data and an image; show the confirmation page and open the new computer.
6. Try to create another computer with the same name, and then one with an invalid value: the error page explains the problem and goes back to the form. Remove the HTML constraints from the form in the browser inspector and submit invalid data to show that the server still rejects it.
7. Edit the computer, change its image and show the confirmation. Edit it again without selecting an image to show that the previous one is kept.
8. Add a component to the computer, show its confirmation and detail page.
9. Edit the component and show the confirmation.
10. Delete the component and show the confirmation.
11. Delete a computer that has components and show the confirmation, which reports how many components were removed.

### Demo video

[▶ Watch the demo on YouTube](https://www.youtube.com/watch?v=REPLACE_WITH_VIDEO_ID)

### Team participation

#### Pablo Montes Gilete

REPLACE: paragraph describing the tasks carried out in Practice 2.

Most relevant commits:

1. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
2. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
3. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
4. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
5. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description


REPLACE: paragraph describing the tasks carried out in Practice 2.

Most relevant commits:

1. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
2. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
3. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
4. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
5. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description


#### Alvaro Pastrana Lopez

REPLACE: paragraph describing the tasks carried out in Practice 2.

Most relevant commits:

1. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
2. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
3. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
4. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description
5. [`REPLACE`](https://github.com/CodeURJC-FW-2026-27/webapp09/commit/REPLACE) — description



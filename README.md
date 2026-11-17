# PC Parts Catalog

PC Parts Catalog is a Web Fundamentals project for browsing and managing computer builds and their hardware components. Computers can be searched by name, filtered by category, and displayed in a paginated catalog. Each computer can contain multiple components.

Compatibility checking is future work and is not currently implemented.

## Requirements

- Node.js 22 or newer
- MongoDB Community Server running locally

## Installation and startup

```sh
npm install
```

Start a local MongoDB server in a separate terminal. Create a database directory first:

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force mongo-data
mongod --dbpath .\mongo-data
```

macOS or Linux:

```sh
mkdir -p mongo-data
mongod --dbpath ./mongo-data
```

Start the application:

```sh
npm start
```

Open [http://localhost:3001/computers](http://localhost:3001/computers). On first startup, an empty catalog is populated with nine example computers and their components. Images in `data/` are copied to `uploads/` using managed image names.

The MongoDB connection URI defaults to `mongodb://127.0.0.1:27017/`. Set `MONGODB_URI` to use a different server. The database name is `pc_parts_catalog`; the HTTP port defaults to `3001` and can be changed with `PORT`.

Run the automated tests with:

```sh
npm test
```

## Demo script

1. Open `/computers` and show the catalog's first page and its pagination to page 2.
2. Search by a computer name, then clear the search.
3. Filter by a computer type and show the filtered results.
4. Open a computer detail page using its ID in `/computers/:id`. Show its image and associated components.
5. Create a computer with valid details and an image; show the creation confirmation.
6. Submit invalid computer data to show the styled validation error page. If browser validation prevents submission, temporarily disable the form's client-side constraints and submit invalid data to demonstrate that the server still rejects it.
7. Edit a computer, replace its image, and show the update confirmation.
8. Add a component to a computer, then show its confirmation and detail page.
9. Edit the component and replace its image; show the update confirmation.
10. Delete the component and verify that the computer detail page opens without a browser dialog.
11. Delete a computer that still has components and show the confirmation page reporting the number of deleted components.

Validation errors and confirmation pages share the catalog header and footer.

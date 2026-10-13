# webapp09

# PC Parts Catalog

## Web Fundamentals

### Project 2026–2027

**Application name:** PC Parts Catalog
**Subject:** Web Fundamentals
**Degree:** Software Engineering
**Academic year:** 2026–2027

## Team Members

| Name                             | University Email                                                          | GitHub                                                        |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Pablo Montes Gilete**          | [p.montes.2025@alumnos.urjc.es](mailto:p.montes.2025@alumnos.urjc.es)     | [pMOGI134](https://github.com/pMOGI134)                       |
| **Yoel Alejandro Adán González** | [ya.adan.2025@alumnos.urjc.es](mailto:ya.adan.2025@alumnos.urjc.es)       | [yoelaleadan-wq](https://github.com/yoelaleadan-wq)           |
| **Alvaro Pastrana Lopez**        | [a.pastrana.2025@alumnos.urjc.es](mailto:a.pastrana.2025@alumnos.urjc.es) | [pastranalvaro30-png](https://github.com/pastranalvaro30-png) |

# Application Description

**PC Parts Catalog** will be a web application designed for the consultation and management of computers and their components.

The application will allow users to browse different computer builds, view their main characteristics, and access their technical information.

The computers will be organized into different categories, such as high-end computers, modern computers, and low-end computers. Users will also be able to view the different components included in each computer.

The application will provide search and categorization functionalities to make it easier to find and organize the different computers.

Additionally, the application will include a **Compatibility Checker** that will allow users to check whether two components are compatible with each other.

The compatibility system will be a basic hardware compatibility system focused on component connections and specifications. Software-related aspects, such as BIOS compatibility, will not be considered.

# Functionality

## Entities

The application will manage two main entities:

* **Computer:** The main entity of the application.
* **Component:** The secondary entity, which represents the hardware components that make up a computer.

### Main Entity: Computer

The `Computer` entity represents a complete computer build.

Its main attributes will be:

| Attribute      | Description                                   |
| -------------- | --------------------------------------------- |
| `Name`         | Name of the computer                          |
| `Brand`        | Computer manufacturer                         |
| `Type`         | Computer type                                 |
| `Description`  | Description of the computer                   |
| `Price`        | Price of the computer                         |
| `Release Date` | Computer release date                         |
| `Image`        | Image representing the computer               |
| `Used`         | Indicates whether the computer is second-hand |

### Secondary Entity: Component

The `Component` entity represents a hardware component that can be included in a computer.

Its attributes will be:

| Attribute     | Description                      |
| ------------- | -------------------------------- |
| `Name`        | Name of the component            |
| `Brand`       | Component manufacturer           |
| `Type`        | Component type                   |
| `Description` | Description of the component     |
| `Price`       | Price of the component           |
| `Image`       | Image representing the component |

For example, a component could have the following technical specifications:

| Name        |    Value | Unit |
| ----------- | -------: | ---- |
| VRAM        |       12 | GB   |
| Memory Type |    GDDR7 | —    |
| TDP         |      250 | W    |
| Interface   | PCIe 5.0 | —    |

## Entity Relationship

Each `Computer` can have several `Component` objects associated with it.

Each `Component` can belong to a computer.

Therefore, the relationship between the two entities is **one-to-many (1:N)**.

For example:

```text
Gaming PC
│
├── CPU → AMD Ryzen 7 7800X3D
├── GPU → NVIDIA GeForce RTX 5070
├── RAM → 32 GB DDR5
├── Storage → 1 TB NVMe SSD
└── PSU → 750 W
```

The components are associated with the computer to which they belong.

## Images

Each object of the `Computer` entity will have at least one image representing the computer.

The images will be displayed both in the main catalog and on the computer detail page.

Components will also have an image representing the hardware component.

## Search and Categorization

### Search

The application will allow users to search for computers by name.

For example, the user could search for:

```text
Gaming PC
```

The application will then display the computers matching the search.

### Categorization

Computers will be classified according to their type.

The initial categories will be:

* High-End Computer
* Modern Computer
* Low-End Computer

Components will also be classified according to their type.

The initial component categories will be:

* CPU
* GPU
* Motherboard
* RAM
* Storage
* PSU
* Case
* Cooling System

The user will be able to select a category and display only the computers or components belonging to that category.


# Computer Management

The application will allow users to manage the computers stored in the catalog.

The following operations will be available:

* **Create:** Add a new computer to the catalog.
* **Modify:** Update the information of an existing computer.
* **Delete:** Remove an existing computer.
* **Modify Image:** Replace the image associated with a computer.


# Example of Use

A possible computer in the catalog could be:

```text
Name: Gaming PC
Brand: Custom Build
Type: High-End Computer
Price: 1899.99 €
Description: High-performance desktop computer designed for gaming.
```

This computer could have the following components:

```text
CPU → AMD Ryzen 7 7800X3D
GPU → NVIDIA GeForce RTX 5070
RAM → 32 GB DDR5
Storage → 1 TB NVMe SSD
PSU → 750 W
```

The GPU component could have the following technical specifications:

```text
VRAM → 12 GB
Memory Type → GDDR7
Interface → PCIe 5.0
TDP → 250 W
```

From the main page, the user could search for:

```text
Gaming PC
```

The application would display the corresponding computer. The user could then access its detail page and view all its information and the components included in the build.

# Application Structure

The application will consist of several main pages:

### Main Catalog Page

The main page will display the available computers in a catalog.

Each computer will show its image and main information.

The user will be able to search for computers and filter them by category.

### Computer Detail Page

This page will display the complete information of a selected computer, including its components.

### Component Detail Page

This page will display the complete information of a selected component, including its technical specifications.


# Practica 1

### 14/10/2026

## Team Members

| Name                             | Contributions                                                                                                        | 
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------|
| **Pablo Montes Gilete**          | Worked in index.html structure, bootstrap and general structure of the web.                                          | 
| **Yoel Alejandro Adán González** | Created details.html, fixed style.css and gave emotianal support to all members                                      |   
| **Alvaro Pastrana Lopez**        | Created the create.html, fixed descriptions and photos of index.html and in the desing of the footer and head of each page. |

## Most relevant  Github commits
**Pablo Montes Gilete** 

* **`4703624`** — [Creation of the index.html] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/4703624ef1dcd1c8011cf4c450d8266ddf701779]) • 
* **`4066ba6`** — [Added search bar ] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/4066ba6d874f0847faaeefc2acb7383a9d4c6bb3]) •
* **`295ce02`** — [Added icon and some photos ] ([(https://github.com/CodeURJC-FW-2026-27/webapp09/commit/295ce02cef85f80d5d45276310f42b70fc763028)]) •
 * **`7f09139`** — [Added the bootstrap desing and had to rewrite all code by error] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/7f09139baa02075837b34adc252ccc563c1b1a46]) •
 
 
 **Yoel Alejandro Adán González**
* **`e080fdc`** — [Creation of the details.html] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/e080fdca97f84c66572ab6896ef6c75efe48235e]) • 
* **`7c16fe6`** — [Add "View Details" links for each PC and create a new HTML file for create a PC] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/7c16fe66f39907008ae4ae3cd78935cf7d154d52]) • 
* **`e897baa`** — [Modified the structure of the divs, created images of the first PC] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/e897baa954feb75c88d026fd8742f55e5d4c7b87]) • 
* **`22f01c5`** — [Enhance details page with component cards] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/22f01c5583056d52d2798e1a0889e624a8232b20]) • 

 
 **Alvaro Pastrana Lopez**
 * **`ddd86c6`** — [Added pc descriptions] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/ddd86c65d63b893ffa977e723d4db0b23810919f]) •

 * **`0951881`** — [Creation of the create.html] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/09518818507e6646f93209d06474df7346c2ecfe]) •

 * **`9cdb552`** — [Remade the whole create] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/9cdb55244c51db15ed8357c50962148b9a2ae74f]) •

* **`ba1583e`** — [Fixed the footer on create] ([https://github.com/CodeURJC-FW-2026-27/webapp09/commit/ba1583e2c40160ed35ac9ac07a65fbb7fe300f58]) •

## Practica 1 preview
<img width="1446" height="792" alt="Captura de pantalla 2026-10-12 130406" src="https://github.com/user-attachments/assets/61ffa42c-a9fa-45bc-8359-48da10760d8a" />
<img width="1452" height="816" alt="Captura de pantalla 2026-10-12 130419" src="https://github.com/user-attachments/assets/0079595f-551f-49f8-b5e8-021dd9bf25b5" />
<img width="1440" height="812" alt="Captura de pantalla 2026-10-12 130436" src="https://github.com/user-attachments/assets/3df77e66-47ab-45a4-9bee-6acdb1bbc3d0" />
<img width="1430" height="800" alt="Captura de pantalla 2026-10-12 130450" src="https://github.com/user-attachments/assets/91fe6b3f-1d75-4cfd-a53b-690d4a4c781e" />
<img width="1395" height="822" alt="Captura de pantalla 2026-10-12 130507" src="https://github.com/user-attachments/assets/3c7f74b3-00aa-4cae-8378-a4b1b72b38e5" />
<img width="1410" height="640" alt="Captura de pantalla 2026-10-12 130517" src="https://github.com/user-attachments/assets/511190b5-b33b-4c58-8fd7-7a60cf7f4d37" />
<img width="1332" height="806" alt="Captura de pantalla 2026-10-12 130533" src="https://github.com/user-attachments/assets/09334f83-2f08-433f-adf9-afe2eabe85bc" />
<img width="1398" height="793" alt="Captura de pantalla 2026-10-12 130546" src="https://github.com/user-attachments/assets/e2d55761-4b43-4878-a466-c08889cad2cd" />








   


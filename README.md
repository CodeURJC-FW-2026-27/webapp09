# webapp09
# PC Parts Catalog

## Web Fundamentals

### Project 2026–2027

**Application name:** PC Parts Catalog
**Subject:** Web Fundamentals
**Degree:** Software Engineering
**Academic year:** 2026–2027

## Team Members

| Name                             | University Email                                                          | GitHub                                                  |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Pablo Montes Gilete**          | [p.montes.2025@alumnos.urjc.es](mailto:p.montes.2025@alumnos.urjc.es)     | [pMOGI134](https://github.com/pMOGI134)                 |
| **Yoel Alejandro Adán González** | [ya.adan.2025@alumnos.urjc.es](mailto:ya.adan.2025@alumnos.urjc.es)       | [yoelaleadan-wq](https://github.com/yoelaleadan-wq)     |
| **Alvaro Pastrana Lopez**        | [a.pastrana.2025@alumnos.urjc.es](mailto:a.pastrana.2025@alumnos.urjc.es) | [pastranalvaro30-png]((https://github.com/pastranalvaro30-png) |

# Application Description

**PC Parts Catalog** will be a web application designed for the consultation and management of computer components.

The application will allow users to browse hardware components, view their main characteristics, and access their technical information.

The components will be organized into different categories, such as processors, graphics cards, motherboards, RAM, storage devices, power supplies, cases, and cooling systems.

The application will provide search and categorization functionalities to make it easier to find and organize the different computer components.

Additionally, the application will include a **Compatibility Checker** that will allow users to check whether two components are compatible with each other.

The compatibility system will be a basic hardware compatibility system focused on component connections and specifications. Software-related aspects, such as BIOS compatibility, will not be considered.

# Functionality

## Entities

The application will manage two entities:

* **Component:** The main entity of the application.
* **Technical Specification:** The secondary entity, which provides additional technical information about a component.

### Main Entity: Component

The `Component` entity represents a computer hardware component.

Its main attributes will be:

| Attribute      | Description                      |
| -------------- | -------------------------------- |
| `Name`         | Name of the component            |
| `Brand`        | Component manufacturer           |
| `Type`         | Component category or type       |
| `Description`  | Description of the component     |
| `Price`        | Price of the component           |
| `Release Date` | Component release date           |
| `Image`        | Image representing the component |

The initial component categories will be:

* CPU
* GPU
* Motherboard
* RAM
* Storage
* PSU (Power Supply Unit)
* Case
* Cooling System

### Secondary Entity: Technical Specification

The `Technical Specification` entity represents a technical characteristic associated with a component.

Its attributes will be:

| Attribute     | Description                                     |
| ------------- | ----------------------------------------------- |
| `Name`        | Name of the technical characteristic            |
| `Value`       | Value of the characteristic                     |
| `Unit`        | Unit used for the value, such as W or GB        |
| `Description` | Additional information about the characteristic |

For example, a GPU could have the following technical specifications:

| Name        |    Value | Unit |
| ----------- | -------: | ---- |
| VRAM        |       12 | GB   |
| Memory Type |    GDDR7 | —    |
| TDP         |      250 | W    |
| Interface   | PCIe 5.0 | —    |

## Entity Relationship

Each `Component` can have several `Technical Specification` objects associated with it.

Each `Technical Specification` belongs to only one `Component`.

Therefore, the relationship between the two entities is **one-to-many (1:N)**.

For example:

```text
RTX 5070
│
├── VRAM → 12 GB
├── Memory Type → GDDR7
├── TDP → 250 W
└── Interface → PCIe 5.0
```

The technical specifications depend on the component to which they belong.

## Images

Each object of the `Component` entity will have at least one image representing the component.

The images will be displayed both in the main catalog and on the component detail page.

The `Technical Specification` entity will not have associated images.

## Search and Categorization

### Search

The application will allow users to search for components by name.

For example, the user could search for:

```text
RTX 5070
```

The application will then display the components matching the search.

### Categorization

Components will be classified according to their type.

The initial categories will be:

* CPU
* GPU
* Motherboard
* RAM
* Storage
* PSU
* Case
* Cooling System

The user will be able to select a category and display only the components belonging to that category.

## Compatibility Checker

The application will include a dedicated interface for checking the compatibility between two components.

The user will select two components and the application will compare the relevant technical specifications.

The system will perform four initial compatibility checks:

| Components        | Compatibility criterion               |
| ----------------- | ------------------------------------- |
| CPU ↔ Motherboard | CPU socket and motherboard socket     |
| Motherboard ↔ RAM | RAM memory type, such as DDR4 or DDR5 |
| GPU ↔ Motherboard | PCIe interface compatibility          |
| GPU ↔ PSU         | Sufficient power supply capacity      |

### CPU ↔ Motherboard

The system will check whether the CPU socket is compatible with the motherboard socket.

### Motherboard ↔ RAM

The system will compare the supported memory type of the motherboard with the memory type of the RAM.

For example:

```text
Motherboard → DDR5
RAM → DDR5

✓ Compatible
```

### GPU ↔ Motherboard

The system will check the PCIe interface compatibility between the GPU and the motherboard.

Because PCIe compatibility can involve many different technical cases, the project will use a simplified compatibility rule. Components with the same PCIe version will be considered compatible, as well as components with a difference of one PCIe generation.

Other cases will be considered incompatible within the scope of this application.

### GPU ↔ PSU

The system will check whether the PSU provides sufficient power for the GPU.

A PSU with insufficient power will be considered incompatible with the selected GPU.

If a compatibility check fails, the application will inform the user which compatibility check failed.

# Component Management

The application will allow users to manage the components stored in the catalog.

The following operations will be available:

* **Create:** Add a new component to the catalog.
* **Modify:** Update the information of an existing component.
* **Delete:** Remove an existing component.
* **Modify Image:** Replace the image associated with a component.

Technical specifications associated with a component will also be managed through the component information.

# Example of Use

A possible component in the catalog could be:

```text
Name: NVIDIA GeForce RTX 5070
Brand: NVIDIA
Type: GPU
Price: 649.99 €
Description: High-performance graphics card for desktop computers.
```

This component could have the following technical specifications:

```text
VRAM → 12 GB
Memory Type → GDDR7
Interface → PCIe 5.0
TDP → 250 W
```

From the main page, the user could search for:

```text
RTX 5070
```

The application would display the corresponding component. The user could then access its detail page and view all its information and technical specifications.

The user could also access the **Compatibility Checker** and compare the component with another component according to the compatibility rules defined by the application.

# Application Structure

The application will consist of several main pages:

### Main Catalog Page

The main page will display the available components in a catalog.

Each component will show its image and main information.

The user will be able to search for components and filter them by category.

### Component Detail Page

This page will display the complete information of a selected component, including its technical specifications.

### Component Management Page

This page will allow users to create, modify, and delete components.

### Compatibility Checker Page

This page will allow users to select two components and check whether they are compatible according to the compatibility rules implemented in the application.

# Project Preview

![Vista previa del proyecto](images/canvas.png)


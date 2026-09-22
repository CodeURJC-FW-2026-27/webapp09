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
| **Alvaro Pastrana Lopez**        | [a.pastrana.2025@alumnos.urjc.es](mailto:a.pastrana.2025@alumnos.urjc.es) | [pastranalvaro30-png](https://github.com/pastranalvaro30-png) |

## 📋 Project Description

This project is a web application focused on the management of complete computer configurations and their hardware components.

The application has two main entities:

- **Computer**: the main entity, representing a complete computer configuration.
- **Component**: the secondary entity, representing a hardware component belonging to a computer.

A computer can contain multiple components, creating a **one-to-many relationship** between `Computer` and `Component`.

The application also includes a **Compatibility Checker**, which analyzes the components of a computer and checks whether they are compatible with each other.

---

## 🖥️ Main Entity: Computer

The `Computer` entity represents a complete computer or PC configuration.

### Attributes

| Attribute | Description |
|---|---|
| `name` | Name of the computer |
| `brand` | Brand or manufacturer |
| `type` | Type of computer |
| `description` | Description of the computer |
| `price` | Price of the computer |
| `releaseDate` | Release date |
| `image` | Image of the computer |

### Computer Types

Computers can be classified into different categories:

- **Gaming**
- **Office**
- **Workstation**
- **Server**

Each computer can contain several hardware components.

For example:

```text
Gaming PC
│
├── CPU
├── Motherboard
├── RAM
├── GPU
├── Storage
├── PSU
├── Case
└── Cooling System

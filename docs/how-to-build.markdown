---
layout: page
title: Budowanie z źródła
parent: Dokumentacja techniczna
nav_order: 0
---
# Budowanie z źródła
## Wymagania wstępne
* windows-build-tools <code>npm install --global windows-build-tools</code>
* Microsoft Visual Studio 2017/2019

## Budowanie
1. ```npm update```
2. ```npm start```

## Zależności
```
    "bcrypt": "^5.0.1",
    "better-sqlite3": "^7.1.5",
    "compression": "^1.7.4",
    "express": "^4.17.1",
    "express-minify": "^1.0.0",
    "n-readlines": "^1.0.1",
    "prompt": "^1.1.0",
    "serialport": "^9.0.6",
    "socket.io": "^4.0.1",
    "socket.io-client": "^4.0.1",
    "socket.io-stream": "^0.9.1",
    "uuid": "^8.3.2"
```

## Migracja do nowej wersji NodeJS
Jeżeli wymagana jest migracja na nową wersje NodeJS należy wykonać komendę która przebuduje wszystkie zależności:

```
npm rebuild
```



---
layout: page
title: Uruchomienie serwera
parent: Instrukcja dla użytkownika
nav_order: 3
---
# Pierwsze uruchomienie serwera
Serwer jest już gotowy do uruchomienia. Aby to zrobić, należy wywołać polecenie
```
npm start
```
Po jego wykonaniu powinien pojawić się tekst mówiący na jakim porcie działa aplikacja serwera.  
**Domyślnie jest to port 3000**
```
NodePrint>npm start
Main app is listening on port 3000
http://localhost:3000
```
Nastepnie należy otworzyć podany adres w przeglądarce internetowej

![Interfejs po starcie](assets/images/web-UI.png)

# Parowanie aplikacji klienckich
~~W celu przeprowadzenia parowania aplikacji klienckich należy przełączyć serwer w przeznaczony do tego tryb~~


Teraz wystarczy tylko uruchomić aplikacje klienckie.
Każdy uruchomiony program kliencki powinien zwrócić informację o pomyślnym połączeniu:
```
>node mirrorservice.js
[SEC] >> Server auth succ.
```
A dane w informacji o eventach jak i statusie powinny zostać zaktualizowane:
![Dane po zparowaniu](assets/images/paired-node.png)


<br>
<br>
<br>
<br>
<br>
<br>
<br>
[Poprzedni krok](client-config.html){: .btn .float-left}
[Następny krok](printer-managment.html){: .btn .btn-blue .float-right}
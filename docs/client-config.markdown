---
layout: page
title: Konfiguracja aplikacji klienckiej
parent: Instrukcja dla użytkownika
nav_order: 2
---
# Przygotowanie aplikacji klienckiej
Ten fragment aplikacji odpowiada za przeprowadzanie poprawnej komunikacji pomiędzy aplikacją serwerową a urządzeniem CNC.  

W folderze `mirror` znajduje się plik `mirrorservice.js`.  
Ten plik należy przekopiować ten plik do innego folderu. 
Następnie przejść do folderu z skopiowanym plikiem oraz go uruchomić przy pomocy polecenia `node mirrorservice.js`.  
Uruchomienie powinno skutkować wyświetleniem informacji o brakach w bazowej konfiguracji.
```
..\NodePrint\mirror>node mirrorservice.js
Fill missing fields in config.cfg
```
Jednocześnie został wygenerowany plik `config.json` w którym znajduje się właściwa konfiguracja dla danego urządzenia krańcowego.

# Konfiguracja adresu serwera

W pliku `config.json` znajduje się następującą treść: 
```
{"nodeId":"fcac8b37-e87f-4cc3-9808-9e1b99d1cd2b","apiKey":null,"comPort":null,"nodeAddress":"ws://localhost:3000"}
```
### Oznaczenia pól:
* nodeId: wygenerowany losowy identyfikator urządzenia **(po przeprowadzeniu parowania z aplikacją serwerową nie zmieniać)**
* apiKey: wygenerowany klucz służący do podpisania komunikacji **(nigdy nie zmieniać)**
* comPort: adres portu fizycznego urządzenia do komunikacji z maszyną CNC
* nodeAddress: adres serwera kontrolującego
  
Teraz należy zmienić pole `nodeAddress` na adres aplikacji serwerowej.
Adres ten możemy sprawdzić wpisując odpowiednie polecenia w terminal systemowy:
* Dla systemu Windows: 
![WindowsIP](assets/images/windowsIp.png)
* Dla systemu Linux:
![LinuxIP](assets/images/linuxIp.png)
* Dla systemu OSX:
![OSXIP](assets/images/OSXIp.png)

#### Przykład:
  Jeżeli widoczny jest adres: `192.168.0.150`
  Plik konfiguracyjny powinien wyglądać tak:
```
{"nodeId":"fcac8b37-e87f-4cc3-9808-9e1b99d1cd2b","apiKey":null,"comPort":null,"nodeAddress":"ws://192.168.0.150:3000"}
```
Tak przygotowana aplikacja jest gotowa do parowania z serwerem.

Kroki należy powtórzyć dla każdej dodatkowej maszyny CNC

<br>
<br>
<br>
<br>
<br>
<br>
<br>
[Poprzedni krok](QuickStart.html){: .btn .float-left}
[Następny krok](server-startup.html){: .btn .btn-blue .float-right}
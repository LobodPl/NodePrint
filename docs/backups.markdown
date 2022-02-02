---
layout: page
title: Kopia zapasowa i sytuacje wyjątkowe
parent: Dokumentacja techniczna
nav_order: 5
---
# Kopia zapasowa
Zalecane jest cykliczne wykonywanie kopi bezpieczeństwa bazy danych (folder "db") oraz folderu "gcode".

Jeżeli przechowywane pliki gcode nie wykazują wartości zaleca się backup bazy danych **ponieważ przechowywanych tam kluczy nie da się w żaden sposób odzyskać.**


# Zachowanie systemu w przypadku wystąpienia błędu
Z względu na architekturę systemu, aplikacja kliencka po otrzymaniu zadania druku ma autonomie w wykonywaniu poleceń i nie wymaga nadzoru serwera głównego.

Jeżeli jednak w casie wykonywania polecenia wystapi błąd zatrzymaniu ulegnie jedynie aplikacja kliencka a odpowiedni komunikat pojawi się z konsoli serwerowej.

# Przywracanie
Przywrócenie oprogramowania z kopii polega na ponownym skopiowaniu folderów "gcode" i "db" do katalogu głównego aplikacji serwerowej. Przy ponownym uruchomieniu aplikacja wczyta poprzednie ustawienia.

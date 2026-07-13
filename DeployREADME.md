# Projet Inventory — Environnement de déploiement (VM Daytona)

> Fiche de rappel : accès à la VM, vérifications d'état, et contexte pour reprendre
> le travail (ou briefer une nouvelle session Claude).

---

## Contexte — à lire en premier

Ce projet (une app SaaS dockerisée) est déployé sur une **VM Ubuntu 22.04**
qui tourne en **QEMU à l'intérieur d'un sandbox Daytona**. Ce n'est pas un VPS
classique : l'architecture est imbriquée sur trois niveaux.

```
Mon PC (Windows, D:\Inventory)
   └─ SSH ProxyJump ─► Sandbox Daytona (conteneur Debian)
                          └─ hostfwd 2222→22 ─► QEMU ─► VM Ubuntu 22.04  ← le projet est ici
```

**Points importants à garder en tête :**

- La VM a une IP **privée** (`10.0.2.15`), derrière le NAT de QEMU.
  → Accessible en SSH via rebond, **mais PAS joignable directement depuis Internet.**
- L'accès distant par tunnel (Tailscale, sshx) est **bloqué** par l'allowlist réseau
  du sandbox. Inutile d'essayer, les domaines sont filtrés.
- La VM survit à un `reboot` **tant que le processus QEMU et le sandbox ne sont pas
  recyclés.** En cas d'arrêt du sandbox, il faut relancer la VM via le script d'install.
- **CONSÉQUENCE POUR LE DÉPLOIEMENT :** cet environnement convient pour
  **développer et tester** la stack Docker. Pour un accès public par les utilisateurs
  finaux (HTTP/HTTPS depuis Internet), il faudra une vraie IP publique — soit migrer
  vers un VPS, soit résoudre l'exposition réseau autrement.
- **Le code source ne doit JAMAIS exister uniquement dans la VM.** Toujours le garder
  sur le PC (`D:\Inventory`) et/ou sur un dépôt git, pour qu'un recyclage du sandbox
  ne coûte que du temps, jamais des données.

---

## Accès SSH depuis le PC (Windows / PowerShell)

### Commande directe (ProxyJump)

```powershell
ssh -J zJKzZnxygJDrxByCKrwaaAiwi6SkRjBY@ssh.app.daytona.io ubuntu@localhost -p 2222
```

- Utilisateur VM : `ubuntu`
- Mot de passe : *(celui défini via `passwd ubuntu`)*
- Le compte `root` **ne se connecte pas** en SSH par mot de passe
  (`PermitRootLogin prohibit-password`). Une fois connecté en `ubuntu`,
  passer root avec `sudo -i`.

### Raccourci — fichier `~/.ssh/config` (recommandé)

Ajouter dans `C:\Users\<vous>\.ssh\config` :

```
Host daytona-vm
    HostName localhost
    Port 2222
    User ubuntu
    ProxyJump zJKzZnxygJDrxByCKrwaaAiwi6SkRjBY@ssh.app.daytona.io
```

Ensuite, connexion en une commande :

```powershell
ssh daytona-vm
```

### Transfert de fichiers PC → VM

```powershell
# avec le raccourci config
scp mon-fichier.zip daytona-vm:~/

# ou en direct
scp -o ProxyJump=zJKzZnxygJDrxByCKrwaaAiwi6SkRjBY@ssh.app.daytona.io -P 2222 mon-fichier.zip ubuntu@localhost:~/
```

---

## Relancer la VM si elle est tombée (après recyclage du sandbox)

Depuis le **conteneur Daytona** (session SSH `ssh.app.daytona.io`, prompt `➜`) :

```bash
# Vérifier si la VM tourne
ps aux | grep -i qemu | grep -v grep

# Si absente, relancer via le script d'install (menu → option 2 : Restart)
bash <(curl -sSL https://raw.githubusercontent.com/dxdgame/DAYTONA-VPS1/main/install.sh)
```

⚠️ Le disque du conteneur Debian est petit (~10 Go) et le fichier VM
(`/home/daytona/ubuntu22.qcow2`) fait ~9 Go. Surveiller `df -h /` côté conteneur :
si saturé, la VM ne peut plus démarrer proprement.

⚠️ Le script définit par défaut le mot de passe `1234` et lance un accès web `sshx`
(bloqué ici). Toujours changer le mot de passe après un boot via le script.

---

## Vérifications d'état (à lancer DANS la VM)

Copier-coller ce bloc pour vérifier que tout est en place :

```bash
echo "=== OS ===" && lsb_release -d
echo "=== Disque ===" && df -h /
echo "=== RAM / Swap ===" && free -h
echo "=== Docker ===" && docker --version && docker compose version
echo "=== Docker actif ? ===" && systemctl is-active docker
echo "=== Arborescence projet ===" && ls -la /srv/app && ls -la /srv/app/data
echo "=== Conteneurs en cours ===" && docker ps
```

### État de référence attendu (au 13/07/2026)

| Élément            | Valeur attendue                                  |
|--------------------|--------------------------------------------------|
| OS                 | Ubuntu 22.04.5 LTS                               |
| Disque `/`         | 196 G total, ~186 G libres (`/dev/sda1`, ext4)   |
| RAM                | 31 Gi                                            |
| Swap               | 8 Gi (`/swapfile`, swappiness=10)                |
| Docker             | 29.6.1                                           |
| Docker Compose     | v5.3.1                                           |
| IP interne VM      | 10.0.2.15 (NAT QEMU — privée)                    |

---

## Arborescence du projet — `/srv/app`

Structure préparée pour un déploiement Docker propre :

```
/srv/app
├── compose/      # docker-compose.yml + .env
├── config/       # configs (nginx, certs, etc.)
├── data/         # volumes persistants (bind-mounts)
│   ├── postgres/ # données PostgreSQL
│   ├── redis/    # données Redis
│   └── uploads/  # fichiers utilisateurs
├── backups/      # dumps de base de données
└── logs/         # journaux applicatifs
```

Les volumes du `docker-compose.yml` doivent pointer vers `/srv/app/data/*`
(bind-mounts) pour que les données vivent à un endroit connu et sauvegardable.

---

## Réglages déjà appliqués sur la VM

- **Swap 8 Go** : `/swapfile`, `vm.swappiness=10` (dans `/etc/sysctl.conf`, persistant).
- **Docker** installé depuis le dépôt officiel, avec limite de logs dans
  `/etc/docker/daemon.json` :
  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
  ```
- **Arborescence `/srv/app`** créée (voir ci-dessus).

---

## Guide opérationnel

👉 Procédure complète (mode local pgAdmin **et** mode Docker prod) :
**[`deploy/README.md`](deploy/README.md)**.

Stack applicative : Django 6 REST API + PostgreSQL (backend dockerisé,
gunicorn + whitenoise). Frontend React/Vite déployé sur **Cloudflare Pages**.

## TODO — prochaines étapes

- [x] Décrire la stack applicative (techno, base de données, rôle de l'app).
- [x] Écrire le `docker-compose.yml` → `deploy/docker-compose.yml` (backend + db).
- [x] Modèle de `.env` → `deploy/.env.example` (à copier en `.env`, **hors git**).
- [ ] Sur la VM : `git clone`, remplir `deploy/.env`, `docker compose up -d --build`.
- [ ] Mettre en place les sauvegardes DB vers `/srv/app/backups/` (cf. guide §3).
- [ ] Décider de la stratégie d'exposition publique (VPS vs autre) pour la mise en prod.

---

## Note pour une reprise / brief Claude

> « Notre app SaaS sera déployée sur cette VM Ubuntu (QEMU dans un sandbox Daytona,
> accès SSH par ProxyJump via `ssh.app.daytona.io` → `ubuntu@localhost:2222`).
> Docker et l'arborescence `/srv/app` sont déjà en place. L'environnement sert au
> **développement/test** ; l'exposition publique reste à résoudre (NAT, pas d'IP
> publique). Le code source vit sur `D:\Inventory` côté PC, à ne pas perdre. »

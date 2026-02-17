# Deploy na Digital Ocean (Droplet)

Passo a passo para configurar o droplet e rodar a aplicação com Docker.

---

## 1. Conectar no droplet

No terminal (substitua `root` pelo usuário e `SEU_IP` pelo IP do droplet):

```bash
ssh root@SEU_IP
```

Se usar chave SSH criada na Digital Ocean, ela já foi associada ao droplet. No Mac/Linux a conexão deve funcionar direto.

---

## 2. Atualizar o sistema e instalar Docker

```bash
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verificar:

```bash
docker --version
docker compose version
```

---

## 3. Enviar o projeto para o droplet

**Opção A – Git (recomendado)**  
Se o código está em um repositório (GitHub, GitLab, etc.):

```bash
apt-get install -y git
git clone https://github.com/SEU_USUARIO/limpeza-capacetes.git
cd limpeza-capacetes
```

**Opção B – SCP do seu computador**  
No **seu Mac** (fora do droplet):

```bash
cd /caminho/para/limpeza-capacetes
scp -r . root@SEU_IP:/root/limpeza-capacetes
```

Depois, no droplet:

```bash
cd /root/limpeza-capacetes
```

---

## 4. Ajustar o docker-compose para produção

No droplet, edite `docker-compose.yml`:

- Garantir que o serviço **app** use `NODE_ENV: production`.
- Na **primeira vez** (para o TypeORM criar as tabelas), você pode rodar uma vez com `NODE_ENV: development` e depois voltar para `production` (veja passo 6).

Exemplo do bloco do app (já em produção):

```yaml
  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/limpeza_capacetes
      NODE_ENV: production
      SEED_SECRET: "escolha-um-token-secreto-forte"
    depends_on:
      db:
        condition: service_healthy
```

Adicione `SEED_SECRET` com um valor que só você saiba (para poder rodar o seed em produção).

---

## 5. Subir a aplicação

Ainda no diretório do projeto no droplet:

```bash
docker compose up -d --build
```

Aguarde o build e os containers subirem. Verificar:

```bash
docker compose ps
```

Os dois serviços (`db` e `app`) devem estar **Up**.

---

## 6. Rodar as migrations (criar tabelas)

Em produção o TypeORM não usa `synchronize`. Rode as migrations com o banco já no ar (containers `db` e `app` ou só `db`).

**No droplet**, no diretório do projeto, com os containers subidos:

```bash
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/limpeza_capacetes npm run migration:run
```

(Use a porta **5433** se o Postgres estiver exposto nela no `docker-compose`; caso contrário use a porta que estiver mapeada para o banco.)

Saída esperada: `Migrations executadas: 1` e o nome da migration.

---

## 7. Criar a máquina (seed)

Com o app no ar e as tabelas criadas:

```bash
curl -H "x-seed-secret: escolha-um-token-secreto-forte" -X POST http://localhost:3000/api/seed
```

Use o mesmo valor que colocou em `SEED_SECRET` no docker-compose. Resposta esperada: `{"message":"Máquina criada","machineId":"..."}`.

Guarde o **machineId** (UUID) e o token da máquina (no seed é `dev-token-máquina-1`) para configurar o firmware do Arduino.

---

## 8. Liberar a porta 3000 no firewall do droplet

Na Digital Ocean: **Networking** do droplet → **Firewall** (ou crie um firewall e associe ao droplet). Libere:

- **Entrada (Inbound):** TCP **3000** (ou 80 se depois colocar nginx na frente).

No próprio Ubuntu (ufw), se estiver ativo:

```bash
ufw allow 3000/tcp
ufw status
ufw enable   # se ainda não estiver ativo
```

---

## 9. Testar de fora

No seu computador ou celular:

```
http://SEU_IP:3000
```

Deve abrir a tela inicial da aplicação (e a máquina aparecer se o seed foi feito).

---

## 10. Configurar o Arduino (firmware)

No `config_wifi.h` do projeto (e depois no firmware que você flashear no ESP32):

- `BACKEND_HOST`: **IP público do droplet** (ex.: `164.92.xxx.xxx`)
- `BACKEND_PORT`: `3000`
- `MACHINE_ID`: UUID retornado no seed (passo 7)
- `MACHINE_TOKEN`: `dev-token-máquina-1` (ou o que estiver no banco para essa máquina)
- `WIFI_SSID` e `WIFI_PASSWORD`: rede do local onde o Arduino vai ficar

---

## Resumo rápido

| # | Ação |
|---|------|
| 1 | SSH no droplet |
| 2 | Instalar Docker + Docker Compose |
| 3 | Clonar ou enviar o projeto (git ou scp) |
| 4 | Adicionar `SEED_SECRET` no docker-compose (app) |
| 5 | `docker compose up -d --build` |
| 6 | Primeira vez: rodar uma vez com NODE_ENV=development para criar tabelas, depois voltar para production |
| 7 | `curl -H "x-seed-secret: SEU_SEGREDO" -X POST http://localhost:3000/api/seed` |
| 8 | Liberar porta 3000 no firewall (DO e/ou ufw) |
| 9 | Acessar http://SEU_IP:3000 |
| 10 | Configurar firmware com IP do droplet e machineId/token |

---

## Opcional: domínio e HTTPS

Para usar um domínio (ex.: `app.seudominio.com`) e HTTPS:

1. Aponte o DNS do domínio para o IP do droplet.
2. Instale um proxy reverso (ex.: nginx) no droplet e configure SSL (Let's Encrypt com certbot).
3. O nginx escuta na 80/443 e repassa para `localhost:3000`.
4. No Arduino, use `BACKEND_HOST` como o domínio e `BACKEND_PORT` 443; no firmware será necessário suporte a HTTPS (WiFiClientSecure).

Isso pode ser documentado em um guia separado se quiser.

#!/usr/bin/env python3
"""Agenda de posts do Instagram/Página da Zippa.

Lê `fila.json`, publica o que venceu, registra o resultado e é rodado pelo
GitHub Action `.github/workflows/instagram-agenda.yml` (diário, 11h de Brasília).

Uso local:
  python3 instagram/agenda.py --simular           # mostra o que faria
  python3 instagram/agenda.py --forcar grid-03    # publica um item agora
  python3 instagram/agenda.py                     # publica o que venceu hoje

Variáveis: META_TOKEN (obrigatória para publicar), IG_ID / PAGE_ID opcionais.
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

API = "https://graph.facebook.com/v27.0"
FUSO = ZoneInfo("America/Sao_Paulo")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILA = os.path.join(RAIZ, "instagram", "fila.json")
REGISTRO = os.path.join(RAIZ, "instagram", "publicados.md")


def token():
    t = os.environ.get("META_TOKEN") or os.environ.get("IG_TOKEN")
    if t:
        return t.strip()
    for caminho in ("/tmp/sys.txt", os.path.expanduser("~/sys.txt")):
        if os.path.exists(caminho):
            return open(caminho).read().strip()
    sys.exit("sem META_TOKEN: defina a variável de ambiente")


def chamar(caminho, dados=None, metodo="GET", tok=None):
    url = f"{API}/{caminho.lstrip('/')}"
    dados = dict(dados or {})
    dados["access_token"] = tok or token()
    corpo = urllib.parse.urlencode(dados).encode()
    if metodo == "GET":
        url += ("&" if "?" in url else "?") + corpo.decode()
        req = urllib.request.Request(url)
    else:
        req = urllib.request.Request(url, data=corpo, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code}: {e.read().decode()[:400]}")


def token_pagina(page_id):
    return chamar(f"{page_id}?fields=access_token")["access_token"]


def publicar_instagram(ig_id, url_imagem, legenda):
    cid = chamar(f"{ig_id}/media", {"image_url": url_imagem, "caption": legenda}, "POST")["id"]
    for _ in range(20):
        st = chamar(f"{cid}?fields=status_code")["status_code"]
        if st == "FINISHED":
            break
        if st in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"container {cid}: {st}")
        time.sleep(6)
    r = chamar(f"{ig_id}/media_publish", {"creation_id": cid}, "POST")
    mid = r["id"]
    info = chamar(f"{mid}?fields=permalink")
    return {"media_id": mid, "link": info.get("permalink")}


def publicar_facebook(page_id, caminho_arquivo, legenda):
    boundary = "----zippa" + uuid.uuid4().hex
    campos = {"access_token": token_pagina(page_id), "message": legenda, "published": "true"}
    partes = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        for k, v in campos.items()
    ]
    nome = os.path.basename(caminho_arquivo)
    mime = "image/jpeg" if nome.lower().endswith((".jpg", ".jpeg")) else "image/png"
    partes.append(
        (
            f'--{boundary}\r\nContent-Disposition: form-data; name="source"; filename="{nome}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode()
    )
    partes.append(open(caminho_arquivo, "rb").read())
    partes.append(f"\r\n--{boundary}--\r\n".encode())
    req = urllib.request.Request(
        f"{API}/{page_id}/photos",
        data=b"".join(partes),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            d = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code}: {e.read().decode()[:400]}")
    pid = d.get("post_id") or d.get("id")
    return {"post_id": pid, "link": f"https://www.facebook.com/{pid}"}


def vencido(post, agora):
    if post.get("publicado"):
        return False
    dia = date.fromisoformat(post["data"])
    if dia < agora.date():
        return True
    if dia > agora.date():
        return False
    hora, minuto = (int(x) for x in post.get("hora", "11:00").split(":"))
    return (agora.hour, agora.minute) >= (hora, minuto)


def registrar(linhas, simulando):
    if simulando or not linhas:
        return
    cabecalho = "# Publicações automáticas\n\n| Data | Post | Instagram | Facebook |\n| --- | --- | --- | --- |\n"
    if not os.path.exists(REGISTRO):
        open(REGISTRO, "w").write(cabecalho)
    atual = open(REGISTRO).read().rstrip("\n")
    open(REGISTRO, "w").write(atual + "\n" + "\n".join(linhas) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--simular", action="store_true")
    ap.add_argument("--forcar", help="id do post na fila, ignorando data")
    args = ap.parse_args()

    dados = json.load(open(FILA))
    conta = dados["conta"]
    agora = datetime.now(FUSO)
    print(f"agora: {agora:%d/%m/%Y %H:%M} (Brasília)")

    alvo = [p for p in dados["posts"] if args.forcar and p["id"] == args.forcar]
    if not alvo:
        alvo = [p for p in dados["posts"] if vencido(p, agora)]

    if not alvo:
        print("nada vencido — fila em dia")
        return

    linhas = []
    falhou = False
    for post in alvo:
        print(f"— {post['id']} ({post['data']} {post.get('hora','')})")
        if args.simular:
            url = f"{conta['site']}/{post['imagem']}"
            try:
                req = urllib.request.Request(url, method="HEAD")
                with urllib.request.urlopen(req, timeout=30) as r:
                    print(f"  imagem no ar: {url} ({r.status})")
            except Exception as e:
                print(f"  ATENÇÃO: imagem não respondeu: {url} ({e})")
            print("  simulação: publicaria nos canais", post["canais"])
            continue
        resultado = {}
        try:
            if "instagram" in post["canais"]:
                resultado["instagram"] = publicar_instagram(
                    conta["ig_id"], f"{conta['site']}/{post['imagem']}", post["legenda"]
                )
            if "facebook" in post["canais"]:
                resultado["facebook"] = publicar_facebook(
                    conta["page_id"], os.path.join(RAIZ, post["imagem"]), post["legenda"]
                )
            post["publicado"] = True
            post["resultado"] = resultado
            ig = resultado.get("instagram", {}).get("link", "—")
            fb = resultado.get("facebook", {}).get("link", "—")
            linhas.append(f"| {post['data']} | {post['id']} | {ig} | {fb} |")
            print(f"  ok: {ig} | {fb}")
        except Exception as erro:
            falhou = True
            post["erro"] = str(erro)
            print(f"  FALHOU: {erro}")

    if not args.simular:
        json.dump(dados, open(FILA, "w"), ensure_ascii=False, indent=2)
        registrar(linhas, False)
        if falhou:
            sys.exit(1)


if __name__ == "__main__":
    main()

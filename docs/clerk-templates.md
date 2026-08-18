# Templates do Clerk — identidade Antecipaqui (copiar e colar)

Cole cada bloco no **Clerk Dashboard → Customization → Emails / SMS**, no template
correspondente. A logo aponta pra `https://www.antecipaqui.digital/brand/logo.png`
(funciona sem depender do upload no Branding).

> ⚠️ **Variáveis:** cada editor do Clerk mostra, à direita, as variáveis
> disponíveis pra AQUELE template (ex.: `{{otp_code}}`, `{{magic_link}}`,
> `{{action_url}}`). Se algum nome abaixo divergir do que o Clerk listar, troque
> pelo que ele mostrar — o resto do HTML continua igual.

---

## 1. Código de verificação — E-MAIL (Verification code)

**Assunto:**
```
Seu código de acesso Antecipaqui: {{otp_code}}
```

**Corpo (HTML):**
```html
<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0c1a2c;background:#eef2f7;margin:0;padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(12,26,44,.06)">
      <div style="background:linear-gradient(135deg,#1c6dd0,#0d4e9e);padding:26px 28px;text-align:center">
        <img src="https://www.antecipaqui.digital/brand/logo.png" alt="Antecipaqui" height="34" style="height:34px;width:auto;display:inline-block" />
      </div>
      <div style="padding:32px 28px">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600">Seu código de acesso</p>
        <p style="margin:0 0 20px;line-height:1.5;color:#5a6571">Use o código abaixo para continuar na Antecipaqui. Ele é pessoal — não compartilhe com ninguém.</p>
        <div style="text-align:center;margin:8px 0 22px">
          <span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:.35em;color:#1c6dd0;background:#f1f6fd;border:1px solid #d7e6fb;border-radius:14px;padding:16px 26px 16px 34px;font-variant-numeric:tabular-nums">{{otp_code}}</span>
        </div>
        <p style="margin:0;line-height:1.5;color:#5a6571;font-size:14px">O código expira em alguns minutos. Se você não pediu este acesso, pode ignorar este e-mail com segurança.</p>
      </div>
      <div style="padding:18px 28px;border-top:1px solid #eef2f7;background:#fbfcfe;font-size:12px;color:#5a6571;line-height:1.5">
        <strong style="color:#1c6dd0">Antecipaqui</strong> — antecipação de comissões imobiliárias.<br/>
        www.antecipaqui.digital
      </div>
    </div>
  </body>
</html>
```

---

## 2. Código de verificação — SMS

```
Antecipaqui: seu codigo de acesso e {{otp_code}}. E pessoal, nao compartilhe. Expira em alguns minutos.
```

---

## 3. Convite — E-MAIL (Invitation)

**Assunto:**
```
Você foi convidado para a Antecipaqui
```

**Corpo (HTML):**
```html
<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0c1a2c;background:#eef2f7;margin:0;padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(12,26,44,.06)">
      <div style="background:linear-gradient(135deg,#1c6dd0,#0d4e9e);padding:26px 28px;text-align:center">
        <img src="https://www.antecipaqui.digital/brand/logo.png" alt="Antecipaqui" height="34" style="height:34px;width:auto;display:inline-block" />
      </div>
      <div style="padding:32px 28px">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600">Seu acesso à Antecipaqui está pronto</p>
        <p style="margin:0 0 22px;line-height:1.5;color:#5a6571">Você foi convidado para a plataforma da Antecipaqui. Clique no botão abaixo para criar seu acesso e começar.</p>
        <div style="text-align:center;margin:8px 0 24px">
          <a href="{{action_url}}" style="display:inline-block;background:#1c6dd0;color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:12px;padding:14px 30px">Criar meu acesso</a>
        </div>
        <p style="margin:0;line-height:1.5;color:#9aa4b0;font-size:13px">Se o botão não abrir, copie e cole este link no navegador:<br/><span style="color:#1c6dd0;word-break:break-all">{{action_url}}</span></p>
      </div>
      <div style="padding:18px 28px;border-top:1px solid #eef2f7;background:#fbfcfe;font-size:12px;color:#5a6571;line-height:1.5">
        <strong style="color:#1c6dd0">Antecipaqui</strong> — antecipação de comissões imobiliárias.<br/>
        www.antecipaqui.digital
      </div>
    </div>
  </body>
</html>
```

---

## 4. Magic link — E-MAIL (Sign-in link)

**Assunto:**
```
Seu link de acesso à Antecipaqui
```

**Corpo (HTML):**
```html
<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0c1a2c;background:#eef2f7;margin:0;padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(12,26,44,.06)">
      <div style="background:linear-gradient(135deg,#1c6dd0,#0d4e9e);padding:26px 28px;text-align:center">
        <img src="https://www.antecipaqui.digital/brand/logo.png" alt="Antecipaqui" height="34" style="height:34px;width:auto;display:inline-block" />
      </div>
      <div style="padding:32px 28px">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600">Entrar na Antecipaqui</p>
        <p style="margin:0 0 22px;line-height:1.5;color:#5a6571">Clique no botão abaixo para entrar. O link é pessoal e expira em alguns minutos.</p>
        <div style="text-align:center;margin:8px 0 24px">
          <a href="{{magic_link}}" style="display:inline-block;background:#1c6dd0;color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:12px;padding:14px 30px">Entrar agora</a>
        </div>
        <p style="margin:0;line-height:1.5;color:#9aa4b0;font-size:13px">Se você não pediu para entrar, ignore este e-mail.</p>
      </div>
      <div style="padding:18px 28px;border-top:1px solid #eef2f7;background:#fbfcfe;font-size:12px;color:#5a6571;line-height:1.5">
        <strong style="color:#1c6dd0">Antecipaqui</strong> — antecipação de comissões imobiliárias.<br/>
        www.antecipaqui.digital
      </div>
    </div>
  </body>
</html>
```

---

## 5. Redefinir senha — E-MAIL (Reset password code)

**Assunto:**
```
Código para redefinir sua senha Antecipaqui: {{otp_code}}
```

**Corpo (HTML):** use o mesmo HTML do item **1 (Código de verificação)**, trocando
só o texto do topo por:
```
Recebemos um pedido para redefinir sua senha. Use o código abaixo para continuar.
```

---

## Onde colar / configurar
- **Branding** (Customization → Branding): Application name = `Antecipaqui`, logo
  (upload do `/brand/logo.png`), cor de destaque `#1C6DD0`.
- **Emails / SMS** (Customization): cole cada template acima no correspondente.
- Desligue o **"Powered by Clerk"** (liberado no Pro).
- Opcional: **domínio de e-mail próprio** pros transacionais (Customization →
  Emails → domínio) — o Clerk mostra os registros DNS pra adicionar.

# Subir a GitHub

Este directorio ya es la raiz del repositorio.

```bash
git init
git add .
git commit -m "Integra MS1 MS2 MS3 y MS4 para produccion"
git branch -M main
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

Antes del `git add`, verifica que **NO exista un archivo `.env`** con contrasenas reales.
El archivo que si debe subirse es `.env.example`.

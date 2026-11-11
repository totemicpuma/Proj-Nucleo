import os
from datetime import datetime
from functools import wraps

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app = Flask(__name__)

# ==========================================
# CONFIGURAÇÃO GERAL
# ==========================================
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'nucleo.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Chave usada para assinar os tokens de sessão. Em produção, defina a
# variável de ambiente SECRET_KEY em vez de usar o valor padrão abaixo.
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-troque-isso-em-producao')
TOKEN_MAX_AGE = 7 * 24 * 60 * 60  # token válido por 7 dias

UPLOAD_DIR = os.path.join(basedir, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_UPLOAD_EXT = {'.pdf', '.png', '.jpg', '.jpeg'}

db = SQLAlchemy(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='nucleo-auth')

# ==========================================
# MODELOS DE BANCO DE DADOS
# ==========================================
class Colaborador(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    ocupacao = db.Column(db.String(100))
    lattes_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default="pendente")  # pendente, aprovado, recusado
    verificado = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    comprovante_path = db.Column(db.String(255), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def set_senha(self, senha_plana):
        self.senha_hash = generate_password_hash(senha_plana)

    def checar_senha(self, senha_plana):
        return check_password_hash(self.senha_hash, senha_plana)

    def gerar_token(self):
        return serializer.dumps({"id": self.id})

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "ocupacao": self.ocupacao,
            "lattes_url": self.lattes_url,
            "status": self.status,
            "verificado": self.verificado,
            "is_admin": self.is_admin,
            "comprovante_path": self.comprovante_path,
            "criado_em": self.criado_em.isoformat() + "Z" if self.criado_em else None
        }
        # nunca incluir senha_hash aqui


class Sugestao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    tipo = db.Column(db.String(50))
    email = db.Column(db.String(120), nullable=True)
    descricao = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="analisando")
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    # Vínculo opcional com a conta do colaborador
    colaborador_id = db.Column(db.Integer, db.ForeignKey('colaborador.id'), nullable=True)
    autor = db.relationship('Colaborador', backref='sugestoes')

    def to_dict(self):
        return {
            "id": self.id,
            "titulo": self.titulo,
            "tipo": self.tipo,
            "email": self.email,
            "descricao": self.descricao,
            "status": self.status,
            "criado_em": self.criado_em.isoformat() + "Z" if self.criado_em else None,
            "autor_nome": self.autor.nome if self.autor else None
        }


# ==========================================
# AUTENTICAÇÃO — HELPERS E DECORATORS
# ==========================================
def _token_da_requisicao():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:].strip()
    token_query = request.args.get('token', '').strip()
    if token_query:
        return token_query
    return None


def usuario_atual():
    """Retorna o Colaborador dono do token da requisição, ou None."""
    token = _token_da_requisicao()
    if not token:
        return None
    try:
        dados = serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    return Colaborador.query.get(dados.get("id"))


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = usuario_atual()
        if not user:
            return jsonify({"detail": "Não autenticado."}), 401
        request.colaborador_atual = user
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = usuario_atual()
        if not user:
            return jsonify({"detail": "Não autenticado."}), 401
        if not user.is_admin:
            return jsonify({"detail": "Acesso restrito a administradores."}), 403
        request.colaborador_atual = user
        return f(*args, **kwargs)
    return wrapper


# ==========================================
# BOOTSTRAP DO BANCO E DO ADMIN PADRÃO
# ==========================================
def _bootstrap_admin():
    """Garante que exista pelo menos um administrador, para o painel /admin
    não ficar sem porta de entrada em uma instalação nova."""
    if Colaborador.query.filter_by(is_admin=True).first():
        return None  # já existe admin, não faz nada

    email = os.environ.get('ADMIN_EMAIL', 'admin@nucleo.local')
    senha = os.environ.get('ADMIN_SENHA', 'nucleo-admin-123')

    admin = Colaborador.query.filter_by(email=email).first()
    if admin:
        admin.is_admin = True
    else:
        admin = Colaborador(
            nome="Administrador",
            email=email,
            ocupacao="admin",
            status="aprovado",
            verificado=True,
            is_admin=True,
        )
        admin.set_senha(senha)
        db.session.add(admin)

    db.session.commit()
    return email, senha


with app.app_context():
    db.create_all()
    _admin_criado = _bootstrap_admin()

# ==========================================
# ROTAS DE INTERFACE (FRONTEND E ADMIN)
# ==========================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin/login')
def admin_login():
    return render_template('admin-login.html')

@app.route('/admin')
@app.route('/admin/dashboard')
def admin_dashboard():
    return render_template('admin.html')

@app.route('/<path:page_name>')
def render_page(page_name):
    template_name = page_name if page_name.endswith('.html') else f"{page_name}.html"
    try:
        return render_template(template_name)
    except Exception:
        return f"Página não encontrada: {template_name}", 404

# ==========================================
# ROTAS DA API — AUTENTICAÇÃO
# ==========================================

@app.route('/api/login', methods=['POST'])
def api_login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get('email') or '').strip().lower()
    senha = dados.get('senha') or ''

    colaborador = Colaborador.query.filter_by(email=email).first()
    if not colaborador or not colaborador.checar_senha(senha):
        return jsonify({"detail": "E-mail ou senha inválidos."}), 401

    token = colaborador.gerar_token()
    return jsonify({"token": token, "colaborador": colaborador.to_dict()}), 200

@app.route('/api/me', methods=['GET'])
@login_required
def api_me():
    return jsonify(request.colaborador_atual.to_dict()), 200

# ==========================================
# ROTAS DA API — COLABORADORES
# ==========================================

@app.route('/api/colaboradores', methods=['GET', 'POST'])
def api_colaboradores():
    if request.method == 'POST':
        if request.is_json:
            dados = request.get_json() or {}
            arquivo = None
        else:
            dados = request.form
            arquivo = request.files.get('comprovante')

        nome = (dados.get('nome') or '').strip()
        email = (dados.get('email') or '').strip().lower()
        senha = dados.get('senha') or ''
        ocupacao = dados.get('ocupacao')
        lattes_url = dados.get('lattes_url') or None

        if not nome or not email or len(senha) < 6:
            return jsonify({"detail": "Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios."}), 400

        if Colaborador.query.filter_by(email=email).first():
            return jsonify({"detail": "Já existe um cadastro com esse e-mail."}), 400

        comprovante_path = None
        if arquivo and arquivo.filename:
            ext = os.path.splitext(arquivo.filename)[1].lower()
            if ext not in ALLOWED_UPLOAD_EXT:
                return jsonify({"detail": "Formato de comprovante não suportado."}), 400
            nome_seguro = secure_filename(f"{email}_{arquivo.filename}")
            arquivo.save(os.path.join(UPLOAD_DIR, nome_seguro))
            comprovante_path = nome_seguro

        novo_colab = Colaborador(
            nome=nome,
            email=email,
            ocupacao=ocupacao,
            lattes_url=lattes_url,
            comprovante_path=comprovante_path,
        )
        novo_colab.set_senha(senha)
        db.session.add(novo_colab)
        db.session.commit()
        return jsonify(novo_colab.to_dict()), 201

    colaboradores = Colaborador.query.all()
    return jsonify([c.to_dict() for c in colaboradores]), 200

@app.route('/api/colaboradores/<int:colab_id>', methods=['PATCH', 'DELETE'])
@admin_required
def gerenciar_colaborador(colab_id):
    colaborador = Colaborador.query.get_or_404(colab_id)

    if request.method == 'PATCH':
        dados = request.get_json(silent=True) or {}
        acao = dados.get('acao')

        if acao == 'aprovar':
            colaborador.status = 'aprovado'
            colaborador.verificado = True
        elif acao == 'recusar':
            colaborador.status = 'recusado'
            colaborador.verificado = False

        db.session.commit()
        return jsonify(colaborador.to_dict()), 200

    if request.method == 'DELETE':
        db.session.delete(colaborador)
        db.session.commit()
        return jsonify({"mensagem": "Colaborador excluído com sucesso."}), 200

@app.route('/uploads/<path:filename>')
@admin_required
def baixar_comprovante(filename):
    return send_from_directory(UPLOAD_DIR, filename)

# ==========================================
# ROTAS DA API — SUGESTÕES
# ==========================================

@app.route('/api/sugestoes', methods=['GET', 'POST'])
def api_sugestoes():
    if request.method == 'POST':
        dados = request.get_json()
        
        # Tenta identificar quem está mandando a requisição
        user = usuario_atual()
        
        nova_sugestao = Sugestao(
            titulo=dados.get('titulo'),
            tipo=dados.get('tipo'),
            email=user.email if user else dados.get('email'),
            descricao=dados.get('descricao'),
            colaborador_id=user.id if user else None
        )
        db.session.add(nova_sugestao)
        db.session.commit()
        return jsonify(nova_sugestao.to_dict()), 201

    sugestoes = Sugestao.query.all()
    return jsonify([s.to_dict() for s in sugestoes]), 200

# ==========================================
# ROTAS DA API — GERENCIAMENTO DE SUGESTÕES
# ==========================================

@app.route('/api/sugestoes/<int:sug_id>', methods=['PATCH', 'DELETE'])
@admin_required
def gerenciar_sugestao(sug_id):
    sugestao = Sugestao.query.get_or_404(sug_id)

    if request.method == 'PATCH':
        dados = request.get_json(silent=True) or {}
        novo_status = dados.get('status')

        if novo_status:
            sugestao.status = novo_status
            
        db.session.commit()
        return jsonify(sugestao.to_dict()), 200

    if request.method == 'DELETE':
        db.session.delete(sugestao)
        db.session.commit()
        return jsonify({"mensagem": "Sugestão excluída com sucesso."}), 200

# ==========================================
# ROTAS DA API — RANKING
# ==========================================
@app.route('/api/ranking', methods=['GET'])
def api_ranking():
    # NOVO: Filtra APENAS colaboradores que já foram aprovados pela moderação.
    # Anônimos, pendentes e recusados são ignorados sumariamente.
    colaboradores = Colaborador.query.filter_by(status='aprovado').all()
    ranking = []
    
    for c in colaboradores:
        # Conta quantas sugestões 'aplicadas' estão atreladas a esse ID específico
        pontos = Sugestao.query.filter_by(colaborador_id=c.id, status='aplicada').count()
        
        # Só entra no ranking se tiver pelo menos 1 sugestão aplicada
        if pontos > 0:
            ranking.append({
                "nome": c.nome,
                "ocupacao": c.ocupacao,
                "pontos": pontos
            })
            
    # Ordena o ranking: quem tem mais pontos primeiro. Em caso de empate, ordem alfabética.
    ranking.sort(key=lambda x: (-x['pontos'], x['nome']))
    
    return jsonify(ranking), 200

# ==========================================
# EXECUÇÃO
# ==========================================
def _print_banner():
    print("=" * 56)
    print(" NÚCLEO — servidor no ar")
    print(" Site:         http://127.0.0.1:5000/")
    print(" Login admin:  http://127.0.0.1:5000/admin/login")
    print(" Painel admin: http://127.0.0.1:5000/admin/dashboard")
    if _admin_criado:
        admin_email, admin_senha = _admin_criado
        print("-" * 56)
        print(" Admin criado automaticamente (primeira execução):")
        print(f"   e-mail: {admin_email}")
        print(f"   senha:  {admin_senha}")
        print("   -> troque essa senha depois de criar seu próprio admin.")
    print("=" * 56)

if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        _print_banner()
    app.run(host='0.0.0.0', port=5000, debug=True)
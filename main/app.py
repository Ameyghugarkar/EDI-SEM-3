from flask import Flask, render_template, jsonify, send_from_directory
import sqlite3
import os

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('safety.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/violations')
def get_violations():
    conn = get_db_connection()
    violations = conn.execute('SELECT * FROM violations ORDER BY id DESC LIMIT 50').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in violations])

@app.route('/violations/<path:filename>')
def serve_image(filename):
    return send_from_directory('violations', filename)

if __name__ == '__main__':
    app.run(debug=True)

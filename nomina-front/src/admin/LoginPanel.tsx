import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Label from '../ui/Label';

export default function LoginPanel({ onLogin }: { onLogin: (ok: boolean) => void }) {
  const [password, setPassword] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // login simple: contraseña en localStorage (env variable could usarse)
    const expected = localStorage.getItem('admin:password') || 'admin';
    if (password === expected) {
      localStorage.setItem('admin:logged', '1');
      onLogin(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  return (
    <div className="p-4 font-sans">
      <Card>
        <h2 className="text-xl font-semibold mb-3">Administrador</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Contraseña</Label>
            <Input
              className="w-full"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            />
          <div className="flex items-center gap-2 mt-3">
            <Button className="bg-emerald-600 text-white">Entrar</Button>
            <Button type="button" className="border" onClick={() => { localStorage.setItem('admin:password','admin'); alert('Contraseña por defecto establecida a admin'); }}>Set default</Button>
          </div>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2">Contraseña por defecto: <strong>admin</strong></p>
      </Card>
    </div>
  );
}

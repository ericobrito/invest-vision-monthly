import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Mail, Sparkles } from "lucide-react";

interface LoginProps {
  onSessionActive: () => void;
}

export default function Login({ onSessionActive }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // If auto-confirm is enabled or if session is active
        if (data.session) {
          toast({
            title: "Conta criada com sucesso!",
            description: "Você foi conectado automaticamente.",
          });
          onSessionActive();
        } else {
          toast({
            title: "Verifique seu e-mail",
            description: "Enviamos um link de confirmação para o seu e-mail.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        toast({
          title: "Bem-vindo de volta!",
          description: "Login realizado com sucesso.",
        });
        onSessionActive();
      }
    } catch (err: any) {
      toast({
        title: "Erro na autenticação",
        description: err.message || "Ocorreu um erro ao tentar acessar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl p-8 shadow-2xl relative">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Meu Bolso Mensal
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isSignUp ? "Crie sua conta para começar" : "Acesse sua conta para ver seus investimentos"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isSignUp ? (
              "Criar Conta"
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs">
          <span className="text-muted-foreground">
            {isSignUp ? "Já tem uma conta? " : "Novo por aqui? "}
          </span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline font-semibold"
            disabled={loading}
          >
            {isSignUp ? "Faça login" : "Crie uma conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

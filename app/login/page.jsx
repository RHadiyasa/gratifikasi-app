"use client";
import React, { useState } from "react";
import { Input, Button, Tabs, Tab, Card, CardBody } from "@heroui/react";
import { loginService } from "@/modules/auth/auth.service";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { useAuthStore } from "@/store/authStore";

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState("login");
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  // STATE UNTUK LOGIN
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");

  // STATE UNTUK REGISTER
  const [nama, setNama] = useState("");
  const [nipReg, setNipReg] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [email, setEmail] = useState("");
  const [noTelp, setNoTelp] = useState("");
  const [passwordReg, setPasswordReg] = useState("");

  // LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await loginService(nip, password);
      if (!response.success) {
        toast.error(response.message);
        return;
      }

      login(response.token);
      toast.success("Login berhasil!");

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan.");
    }
  };

  // REGISTER HANDLER
  const handleRegister = async () => {
    
  };

  return (
    <div className="flex flex-col items-center justify-center text-foreground h-full">
      <ToastContainer />
      <div>
        <h1 className="text-center font-bold text-2xl py-10">Login UPG</h1>
        <Card className="w-[400px] shadow-xl rounded-2xl">
          <CardBody>
            <Tabs
              aria-label="Login/Register Tabs"
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(String(key))}
              variant="underlined"
            >
              {/* TAB LOGIN */}
              <Tab key="login" title="Login">
                <form
                  onSubmit={handleLogin}
                  className="flex flex-col gap-4 mt-4"
                >
                  <Input
                    label="NIP"
                    placeholder="Masukkan NIP Anda"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    required
                  />
                  <Input
                    label="Password"
                    placeholder="Masukkan password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" color="primary" fullWidth>
                    Login
                  </Button>
                </form>
              </Tab>

              {/* TAB REGISTER */}
              <Tab key="register" title="Register">
                <form
                  onSubmit={handleRegister}
                  className="flex flex-col gap-3 mt-4"
                >
                  <Input
                    label="Nama"
                    placeholder="Nama lengkap"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                  <Input
                    label="NIP"
                    placeholder="Masukkan NIP"
                    value={nipReg}
                    onChange={(e) => setNipReg(e.target.value)}
                    required
                  />
                  <Input
                    label="Jabatan"
                    placeholder="Masukkan jabatan"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    required
                  />
                  <Input
                    label="Unit Kerja"
                    placeholder="Masukkan unit kerja"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    required
                  />
                  <Input
                    label="Email"
                    placeholder="Masukkan email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Nomor Telepon"
                    placeholder="Masukkan nomor telepon"
                    value={noTelp}
                    onChange={(e) => setNoTelp(e.target.value)}
                    required
                  />
                  <Input
                    label="Password"
                    placeholder="Masukkan password"
                    type="password"
                    value={passwordReg}
                    onChange={(e) => setPasswordReg(e.target.value)}
                    required
                  />
                  <Button type="submit" color="success" fullWidth>
                    Register
                  </Button>
                </form>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

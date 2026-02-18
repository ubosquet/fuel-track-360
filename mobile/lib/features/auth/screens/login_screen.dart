import 'package:flutter/material.dart';

/// Phone OTP Login Screen — Primary auth for Haiti drivers
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0B1120), Color(0xFF0D47A1), Color(0xFF1565C0)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  Container(
                    width: 80, height: 80,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      color: Colors.white.withOpacity(0.1),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: const Center(
                      child: Text('FT', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Fuel-Track-360', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text('Logistique pétrolière', style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.6))),
                  const SizedBox(height: 48),

                  // Form
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      color: Colors.white.withOpacity(0.1),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _otpSent ? 'Kòd Verifikasyon' : 'Koneksyon',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 20),

                        if (!_otpSent) ...[
                          Text('Nimewo telefòn', style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7))),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: '+509 XXXX XXXX',
                              hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                              prefixIcon: const Icon(Icons.phone, color: Colors.white54),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.2))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.2))),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFFF6D00))),
                            ),
                          ),
                        ] else ...[
                          Text('Antre kòd 6 chif yo', style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7))),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            style: const TextStyle(color: Colors.white, fontSize: 24, letterSpacing: 8),
                            textAlign: TextAlign.center,
                            decoration: InputDecoration(
                              counterText: '',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.2))),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFFF6D00))),
                            ),
                          ),
                        ],

                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _loading ? null : (_otpSent ? _verifyOtp : _sendOtp),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFF6D00),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: _loading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : Text(_otpSent ? 'Verifye' : 'Voye kòd la', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),

                        if (_otpSent) ...[
                          const SizedBox(height: 12),
                          Center(
                            child: TextButton(
                              onPressed: () => setState(() => _otpSent = false),
                              child: Text('Chanje nimewo', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  Text('🇭🇹 Sécurisé par Firebase', style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.3))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _sendOtp() {
    setState(() => _loading = true);
    // In production: FirebaseAuth.instance.verifyPhoneNumber(...)
    Future.delayed(const Duration(seconds: 1), () {
      setState(() { _otpSent = true; _loading = false; });
    });
  }

  void _verifyOtp() {
    setState(() => _loading = true);
    // In production: verify OTP credential
    Future.delayed(const Duration(seconds: 1), () {
      setState(() => _loading = false);
      // Navigate to dashboard
    });
  }
}

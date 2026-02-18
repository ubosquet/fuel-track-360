import 'package:flutter/material.dart';

/// S2L Checklist Screen — The primary driver interaction
///
/// Flow:
/// 1. Select truck and station
/// 2. GPS auto-detected, geofence checked
/// 3. Complete 20-item checklist (toggle each item)
/// 4. Take minimum 3 photos
/// 5. Capture digital signature
/// 6. Submit → status changes to SUBMITTED
class S2LChecklistScreen extends StatefulWidget {
  const S2LChecklistScreen({super.key});

  @override
  State<S2LChecklistScreen> createState() => _S2LChecklistScreenState();
}

class _S2LChecklistScreenState extends State<S2LChecklistScreen> {
  int _currentStep = 0;
  String? _selectedTruckId;
  String? _selectedStationId;
  final List<Map<String, dynamic>> _checklistItems = List.generate(
    20,
    (i) => {
      final labels = [
        'Pneus en bon état', 'Freins fonctionnels', 'Feux avant/arrière',
        'Rétroviseurs intacts', 'Ceinture de sécurité', 'Extincteur présent',
        'Kit de premiers secours', 'Triangle de signalisation', 'Niveau d\'huile',
        'Liquide de frein', 'Joints de compartiment', 'Vannes de déchargement',
        'Jauge de niveau', 'Mise à terre (grounding)', 'Plaque d\'immatriculation',
        'Documents du véhicule', 'Permis de conduire', 'Connexion GPS active',
        'Pare-brise intact', 'État général du camion',
      ];
      return {
        'item_id': 'item_${i + 1}',
        'label': labels[i],
        'value': false,
      };
    },
  );
  final List<String> _photos = [];
  bool _hasSigned = false;

  int get _passCount => _checklistItems.where((i) => i['value'] == true).length;
  bool get _allPass => _passCount == _checklistItems.length;
  bool get _hasEnoughPhotos => _photos.length >= 3;
  bool get _canSubmit => _allPass && _hasEnoughPhotos && _hasSigned;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Safe to Load (S2L)'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _canSubmit ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _canSubmit ? Icons.check_circle : Icons.pending,
                  size: 16,
                  color: _canSubmit ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 4),
                Text(
                  _canSubmit ? 'Prêt' : 'En cours',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _canSubmit ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Stepper(
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep < 4) setState(() => _currentStep++);
        },
        onStepCancel: () {
          if (_currentStep > 0) setState(() => _currentStep--);
        },
        controlsBuilder: (context, details) {
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(
              children: [
                if (_currentStep < 4)
                  ElevatedButton(
                    onPressed: details.onStepContinue,
                    child: const Text('Suivant'),
                  ),
                if (_currentStep == 4)
                  ElevatedButton(
                    onPressed: _canSubmit ? _submitS2L : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _canSubmit ? Colors.green : Colors.grey,
                    ),
                    child: const Text('Soumettre le S2L'),
                  ),
                const SizedBox(width: 8),
                if (_currentStep > 0)
                  TextButton(
                    onPressed: details.onStepCancel,
                    child: const Text('Précédent'),
                  ),
              ],
            ),
          );
        },
        steps: [
          // Step 0: Truck & Station Selection
          Step(
            title: const Text('Sélection'),
            subtitle: Text(_selectedTruckId != null ? 'Camion sélectionné' : 'Choisir camion et station'),
            isActive: _currentStep >= 0,
            state: _selectedTruckId != null ? StepState.complete : StepState.indexed,
            content: _buildSelectionStep(),
          ),
          // Step 1: Checklist
          Step(
            title: const Text('Vérification'),
            subtitle: Text('$_passCount / ${_checklistItems.length} validés'),
            isActive: _currentStep >= 1,
            state: _allPass ? StepState.complete : StepState.indexed,
            content: _buildChecklistStep(),
          ),
          // Step 2: Photos
          Step(
            title: const Text('Photos'),
            subtitle: Text('${_photos.length} / 3 minimum'),
            isActive: _currentStep >= 2,
            state: _hasEnoughPhotos ? StepState.complete : StepState.indexed,
            content: _buildPhotosStep(),
          ),
          // Step 3: Signature
          Step(
            title: const Text('Signature'),
            subtitle: Text(_hasSigned ? 'Signé ✓' : 'En attente'),
            isActive: _currentStep >= 3,
            state: _hasSigned ? StepState.complete : StepState.indexed,
            content: _buildSignatureStep(),
          ),
          // Step 4: Review & Submit
          Step(
            title: const Text('Soumission'),
            subtitle: Text(_canSubmit ? 'Prêt à soumettre' : 'Conditions non remplies'),
            isActive: _currentStep >= 4,
            state: _canSubmit ? StepState.complete : StepState.indexed,
            content: _buildReviewStep(),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectionStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Truck selection mock
        Card(
          child: ListTile(
            leading: const Icon(Icons.local_shipping, color: Color(0xFF0D47A1)),
            title: const Text('Camion'),
            subtitle: Text(_selectedTruckId ?? 'Sélectionner un camion'),
            trailing: DropdownButton<String>(
              value: _selectedTruckId,
              hint: const Text('Choisir'),
              items: ['AA-00001', 'AA-00002', 'AA-00003']
                  .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                  .toList(),
              onChanged: (v) => setState(() => _selectedTruckId = v),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const Icon(Icons.location_on, color: Color(0xFFFF6D00)),
            title: const Text('Station'),
            subtitle: Text(_selectedStationId ?? 'Auto-détectée par GPS'),
            trailing: DropdownButton<String>(
              value: _selectedStationId,
              hint: const Text('Choisir'),
              items: ['Terminal Thor', 'Station Delmas', 'Terminal Nord']
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
              onChanged: (v) => setState(() => _selectedStationId = v),
            ),
          ),
        ),
        const SizedBox(height: 8),
        // GPS indicator
        Card(
          color: Colors.green.shade50,
          child: const ListTile(
            leading: Icon(Icons.gps_fixed, color: Colors.green),
            title: Text('📍 Position GPS'),
            subtitle: Text('18.5393° N, 72.3366° W — Dans la zone de géofence'),
          ),
        ),
      ],
    );
  }

  Widget _buildChecklistStep() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _checklistItems.length,
      itemBuilder: (context, index) {
        final item = _checklistItems[index];
        return SwitchListTile(
          title: Text(
            item['label'],
            style: TextStyle(
              fontSize: 14,
              color: item['value'] ? Colors.green.shade700 : null,
            ),
          ),
          subtitle: Text('Item ${index + 1}'),
          value: item['value'],
          activeColor: Colors.green,
          onChanged: (v) => setState(() => _checklistItems[index]['value'] = v),
        );
      },
    );
  }

  Widget _buildPhotosStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Minimum 3 photos requises: avant du camion, arrière, et compartiments',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ..._photos.map((p) => Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: Colors.green.shade100,
                border: Border.all(color: Colors.green),
              ),
              child: const Icon(Icons.check_circle, color: Colors.green, size: 32),
            )),
            InkWell(
              onTap: () {
                // In production: use camera to take photo
                setState(() => _photos.add('photo_${_photos.length + 1}'));
              },
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid, width: 2),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.camera_alt, color: Colors.grey.shade400),
                    Text('Ajouter', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (!_hasEnoughPhotos)
          Text(
            '⚠️ ${3 - _photos.length} photo(s) restante(s)',
            style: const TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold),
          ),
      ],
    );
  }

  Widget _buildSignatureStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Signez dans la zone ci-dessous pour confirmer l\'inspection.'),
        const SizedBox(height: 12),
        Container(
          height: 200,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _hasSigned ? Colors.green : Colors.grey.shade300),
            color: _hasSigned ? Colors.green.shade50 : Colors.grey.shade50,
          ),
          child: Center(
            child: _hasSigned
                ? const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 48),
                      SizedBox(height: 8),
                      Text('Signature capturée ✓', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    ],
                  )
                : const Text('Zone de signature\n(SignaturePad widget)', textAlign: TextAlign.center),
          ),
        ),
        const SizedBox(height: 8),
        if (!_hasSigned)
          ElevatedButton.icon(
            onPressed: () => setState(() => _hasSigned = true),
            icon: const Icon(Icons.draw),
            label: const Text('Signer'),
          ),
      ],
    );
  }

  Widget _buildReviewStep() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Résumé', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Divider(),
            _reviewRow('Camion', _selectedTruckId ?? '—', _selectedTruckId != null),
            _reviewRow('Station', _selectedStationId ?? '—', _selectedStationId != null),
            _reviewRow('Vérification', '$_passCount / ${_checklistItems.length}', _allPass),
            _reviewRow('Photos', '${_photos.length} / 3 min', _hasEnoughPhotos),
            _reviewRow('Signature', _hasSigned ? 'Oui' : 'Non', _hasSigned),
            const Divider(),
            if (!_canSubmit)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _buildMissingRequirements(),
                        style: const TextStyle(fontSize: 12, color: Colors.orange),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _reviewRow(String label, String value, bool ok) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(ok ? Icons.check_circle : Icons.cancel, size: 18, color: ok ? Colors.green : Colors.red),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          const Spacer(),
          Text(value, style: TextStyle(color: ok ? Colors.green.shade700 : Colors.red.shade700)),
        ],
      ),
    );
  }

  String _buildMissingRequirements() {
    final missing = <String>[];
    if (!_allPass) missing.add('Tous les éléments doivent être validés');
    if (!_hasEnoughPhotos) missing.add('Minimum 3 photos requises');
    if (!_hasSigned) missing.add('Signature obligatoire');
    return missing.join('\n');
  }

  void _submitS2L() {
    // In production: save to Drift DB + add to SyncQueue
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('✅ S2L soumis avec succès! En attente de synchronisation...'),
        backgroundColor: Colors.green,
      ),
    );
    Navigator.of(context).pop();
  }
}

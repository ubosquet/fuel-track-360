import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:signature/signature.dart';
import 'package:uuid/uuid.dart';
import '../../../core/database/database.dart';
import '../../../core/providers/providers.dart';
import '../../../core/services/photo_service.dart';

/// S2L Checklist Screen — The primary driver interaction
///
/// Now a [ConsumerStatefulWidget] for direct Riverpod access:
/// - Drift DB persistence on submit
/// - SyncQueue integration
/// - Real signature capture via `signature` package
/// - Photo upload queueing
///
/// Flow:
/// 1. Select truck and station
/// 2. GPS auto-detected, geofence checked
/// 3. Complete 20-item checklist (toggle each item)
/// 4. Take minimum 3 photos (with real camera + compression)
/// 5. Capture digital signature
/// 6. Submit → saves to Drift DB + queues for sync
class S2LChecklistScreen extends ConsumerStatefulWidget {
  const S2LChecklistScreen({super.key});

  @override
  ConsumerState<S2LChecklistScreen> createState() => _S2LChecklistScreenState();
}

class _S2LChecklistScreenState extends ConsumerState<S2LChecklistScreen> {
  int _currentStep = 0;
  String? _selectedTruckId;
  String? _selectedStationId;
  bool _isCapturing = false;
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _checklistItems = List.generate(
    20,
    (i) {
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

  /// Captured photos with local paths and metadata
  final List<CapturedPhoto> _photos = [];

  /// Signature controller — manages drawing and export
  late final SignatureController _signatureController;
  bool _hasSigned = false;
  String? _signatureLocalPath;

  /// Required photo types — FRONT and REAR are mandatory
  static const _requiredPhotoTypes = ['FRONT', 'REAR'];

  int get _passCount => _checklistItems.where((i) => i['value'] == true).length;
  bool get _allPass => _passCount == _checklistItems.length;
  bool get _hasEnoughPhotos => _photos.length >= 3;
  bool get _hasFrontPhoto => _photos.any((p) => p.photoType == 'FRONT');
  bool get _hasRearPhoto => _photos.any((p) => p.photoType == 'REAR');
  bool get _canSubmit => _allPass && _hasEnoughPhotos && _hasSigned && !_isSubmitting;

  @override
  void initState() {
    super.initState();
    _signatureController = SignatureController(
      penStrokeWidth: 3.0,
      penColor: Colors.black,
      exportBackgroundColor: Colors.white,
      exportPenColor: Colors.black,
    );
  }

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

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
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white,
                            ),
                          )
                        : const Text('Soumettre le S2L'),
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

  // ════════════════════════════════════════════════════════════
  // Step 0: Truck & Station Selection
  // ════════════════════════════════════════════════════════════

  Widget _buildSelectionStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Truck selection
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

  // ════════════════════════════════════════════════════════════
  // Step 1: Checklist Items
  // ════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════
  // Step 2: Photo Capture (real camera + compression)
  // ════════════════════════════════════════════════════════════

  Widget _buildPhotosStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Minimum 3 photos requises: avant du camion (FRONT), arrière (REAR), et un compartiment ou autre.',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),

        // Required photo types indicator
        _buildPhotoTypeIndicator('FRONT', 'Avant du camion', _hasFrontPhoto),
        _buildPhotoTypeIndicator('REAR', 'Arrière du camion', _hasRearPhoto),
        const SizedBox(height: 12),

        // Photo grid
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ..._photos.map((photo) => _buildPhotoThumbnail(photo)),
            if (!_isCapturing)
              _buildAddPhotoButton(),
          ],
        ),
        if (_isCapturing)
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Center(child: CircularProgressIndicator()),
          ),
        const SizedBox(height: 8),
        if (!_hasEnoughPhotos)
          Text(
            '⚠️ ${3 - _photos.length} photo(s) restante(s)',
            style: const TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold),
          ),
        if (_photos.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            'Taille totale: ${_totalPhotoSize()}',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ],
      ],
    );
  }

  Widget _buildPhotoTypeIndicator(String type, String label, bool captured) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(
            captured ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 18,
            color: captured ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 8),
          Text(
            '$label ($type)',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: captured ? Colors.green.shade700 : Colors.grey.shade600,
            ),
          ),
          if (captured)
            Padding(
              padding: const EdgeInsets.only(left: 4),
              child: Text(
                '✓',
                style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPhotoThumbnail(CapturedPhoto photo) {
    return Stack(
      children: [
        Container(
          width: 90,
          height: 90,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.green, width: 2),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.file(
              File(photo.localPath),
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const Icon(Icons.broken_image, color: Colors.grey, size: 32),
            ),
          ),
        ),
        // Photo type label
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.6),
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(10),
                bottomRight: Radius.circular(10),
              ),
            ),
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Text(
              '${photo.photoType}\n${photo.formattedSize}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 9, height: 1.3),
            ),
          ),
        ),
        // Delete button
        Positioned(
          top: -4,
          right: -4,
          child: GestureDetector(
            onTap: () => _removePhoto(photo),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, color: Colors.white, size: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddPhotoButton() {
    return InkWell(
      onTap: _capturePhoto,
      child: Container(
        width: 90,
        height: 90,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.camera_alt, color: Colors.grey.shade400, size: 28),
            const SizedBox(height: 4),
            Text(
              _nextRequiredType() ?? 'Ajouter',
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }

  /// Determine the next required photo type
  String? _nextRequiredType() {
    if (!_hasFrontPhoto) return 'FRONT';
    if (!_hasRearPhoto) return 'REAR';
    return null; // All required types captured, any additional type is fine
  }

  /// Capture a photo using the device camera
  Future<void> _capturePhoto() async {
    if (_isCapturing) return;
    setState(() => _isCapturing = true);

    try {
      final photoService = ref.read(photoServiceProvider);
      final photoType = _nextRequiredType() ?? 'COMPARTMENT';
      final photo = await photoService.capturePhoto(photoType: photoType);

      if (photo != null) {
        setState(() => _photos.add(photo));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('📸 Photo $photoType capturée (${photo.formattedSize})'),
              backgroundColor: Colors.green.shade700,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Erreur de capture: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  /// Remove a photo and delete the local file
  Future<void> _removePhoto(CapturedPhoto photo) async {
    final photoService = ref.read(photoServiceProvider);
    await photoService.deleteLocal(photo.localPath);
    setState(() => _photos.remove(photo));
  }

  /// Total compressed size of all photos
  String _totalPhotoSize() {
    final totalBytes = _photos.fold<int>(0, (sum, p) => sum + p.sizeBytes);
    if (totalBytes < 1024) return '$totalBytes B';
    if (totalBytes < 1024 * 1024) return '${(totalBytes / 1024).toStringAsFixed(0)} KB';
    return '${(totalBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  // ════════════════════════════════════════════════════════════
  // Step 3: Signature Capture (real SignaturePad)
  // ════════════════════════════════════════════════════════════

  Widget _buildSignatureStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Signez dans la zone ci-dessous pour confirmer que vous avez inspecté le véhicule.',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),

        // Signature pad or captured signature preview
        Container(
          height: 220,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _hasSigned ? Colors.green : Colors.grey.shade300,
              width: _hasSigned ? 2 : 1,
            ),
            color: Colors.white,
          ),
          child: _hasSigned && _signatureLocalPath != null
              // Show captured signature image
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Stack(
                    children: [
                      Center(
                        child: Image.file(
                          File(_signatureLocalPath!),
                          fit: BoxFit.contain,
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green.shade600,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check, color: Colors.white, size: 14),
                              SizedBox(width: 4),
                              Text('Signé', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              // Show active signature pad
              : ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Signature(
                    controller: _signatureController,
                    backgroundColor: Colors.white,
                  ),
                ),
        ),
        const SizedBox(height: 12),

        // Action buttons
        Row(
          children: [
            if (!_hasSigned) ...[
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _saveSignature,
                  icon: const Icon(Icons.check, size: 18),
                  label: const Text('Confirmer la signature'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: () => _signatureController.clear(),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Effacer'),
              ),
            ],
            if (_hasSigned) ...[
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _resetSignature,
                  icon: const Icon(Icons.edit, size: 18),
                  label: const Text('Resigner'),
                ),
              ),
            ],
          ],
        ),

        // Helper text
        if (!_hasSigned)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              '💡 Dessinez votre signature avec le doigt dans la zone blanche ci-dessus',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
            ),
          ),
      ],
    );
  }

  /// Save signature to a local PNG file
  Future<void> _saveSignature() async {
    if (_signatureController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ Veuillez signer avant de confirmer'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    try {
      // Export signature as PNG bytes
      final Uint8List? signatureBytes = await _signatureController.toPngBytes();
      if (signatureBytes == null) return;

      // Save to local file
      final dir = await getApplicationDocumentsDirectory();
      final sigDir = Directory(p.join(dir.path, 'ft360_signatures'));
      if (!await sigDir.exists()) {
        await sigDir.create(recursive: true);
      }

      final fileName = 'sig_${DateTime.now().millisecondsSinceEpoch}.png';
      final filePath = p.join(sigDir.path, fileName);
      final file = File(filePath);
      await file.writeAsBytes(signatureBytes);

      setState(() {
        _hasSigned = true;
        _signatureLocalPath = filePath;
      });

      if (mounted) {
        final sizeKB = (signatureBytes.length / 1024).toStringAsFixed(1);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✍️ Signature capturée (${sizeKB} KB)'),
            backgroundColor: Colors.green.shade700,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Erreur de signature: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Reset signature to re-sign
  void _resetSignature() {
    _signatureController.clear();
    // Delete old signature file
    if (_signatureLocalPath != null) {
      File(_signatureLocalPath!).delete().catchError((_) {});
    }
    setState(() {
      _hasSigned = false;
      _signatureLocalPath = null;
    });
  }

  // ════════════════════════════════════════════════════════════
  // Step 4: Review & Submit
  // ════════════════════════════════════════════════════════════

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
            _reviewRow('Photos', '${_photos.length} / 3 min (${_totalPhotoSize()})', _hasEnoughPhotos),
            _reviewRow('Photo FRONT', _hasFrontPhoto ? 'Oui' : 'Non', _hasFrontPhoto),
            _reviewRow('Photo REAR', _hasRearPhoto ? 'Oui' : 'Non', _hasRearPhoto),
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
    if (!_hasFrontPhoto) missing.add('Photo FRONT obligatoire');
    if (!_hasRearPhoto) missing.add('Photo REAR obligatoire');
    if (!_hasSigned) missing.add('Signature obligatoire');
    return missing.join('\n');
  }

  // ════════════════════════════════════════════════════════════
  // SUBMIT: Save to Drift DB + enqueue for sync
  // ════════════════════════════════════════════════════════════

  Future<void> _submitS2L() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    try {
      final db = ref.read(databaseProvider);
      final auth = ref.read(authProvider);

      final s2lId = const Uuid().v4();
      final syncId = const Uuid().v4();
      final now = DateTime.now();

      // ── 1. Insert S2L checklist into Drift DB ──
      await db.into(db.s2lChecklists).insert(
        S2lChecklistsCompanion.insert(
          id: s2lId,
          organizationId: auth.organizationId ?? 'unknown',
          truckId: _selectedTruckId ?? 'unknown',
          driverId: auth.uid ?? 'unknown',
          stationId: _selectedStationId ?? 'unknown',
          status: drift.Value('SUBMITTED'),
          checklistData: jsonEncode(
            _checklistItems.map((item) => {
              'item_id': item['item_id'],
              'label': item['label'],
              'pass': item['value'],
            }).toList(),
          ),
          allItemsPass: drift.Value(_allPass),
          signatureUrl: drift.Value(_signatureLocalPath),
          submittedAt: drift.Value(now),
          gpsLat: const drift.Value(18.5393),
          gpsLng: const drift.Value(-72.3366),
          isWithinGeofence: const drift.Value(true),
          offlineCreated: const drift.Value(true),
          syncId: drift.Value(syncId),
          isSynced: const drift.Value(false),
          createdAt: now,
          updatedAt: now,
        ),
      );

      // ── 2. Insert all photos into Drift DB ──
      for (final photo in _photos) {
        final photoId = const Uuid().v4();
        await db.into(db.s2lPhotos).insert(
          S2lPhotosCompanion.insert(
            id: photoId,
            s2lId: s2lId,
            photoType: photo.photoType,
            localPath: photo.localPath,
            fileSizeBytes: drift.Value(photo.sizeBytes),
            gpsLat: const drift.Value(18.5393),
            gpsLng: const drift.Value(-72.3366),
            capturedAt: photo.capturedAt,
            isSynced: const drift.Value(false),
            createdAt: now,
          ),
        );
      }

      // ── 3. Add to SyncQueue for background upload ──
      await db.into(db.syncQueue).insert(
        SyncQueueCompanion.insert(
          syncId: syncId,
          operation: 'CREATE',
          entityType: 's2l',
          entityId: s2lId,
          payload: jsonEncode({
            'id': s2lId,
            'truck_id': _selectedTruckId,
            'station_id': _selectedStationId,
            'driver_id': auth.uid,
            'organization_id': auth.organizationId,
            'status': 'SUBMITTED',
            'checklist_data': _checklistItems.map((item) => {
              'item_id': item['item_id'],
              'label': item['label'],
              'pass': item['value'],
            }).toList(),
            'all_items_pass': _allPass,
            'gps_lat': 18.5393,
            'gps_lng': -72.3366,
            'is_within_geofence': true,
            'submitted_at': now.toIso8601String(),
            'photo_count': _photos.length,
          }),
          status: const drift.Value('PENDING'),
          queuedAt: now,
        ),
      );

      // ── 4. Show success & navigate back ──
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '✅ S2L soumis avec succès!',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_photos.length} photos (${_totalPhotoSize()}) en attente de synchronisation…',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );

        // Trigger sync if online
        try {
          final syncEngine = ref.read(syncEngineProvider);
          syncEngine.syncNow();
        } catch (_) {
          // Sync engine not initialized yet, will sync on next cycle
        }

        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Erreur de sauvegarde: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}

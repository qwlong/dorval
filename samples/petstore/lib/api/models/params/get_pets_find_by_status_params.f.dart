// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names

import 'package:freezed_annotation/freezed_annotation.dart';

part 'get_pets_find_by_status_params.f.freezed.dart';
part 'get_pets_find_by_status_params.f.g.dart';

/// Query parameters for getPetsFindByStatus
@freezed
class GetPetsFindByStatusParams with _$GetPetsFindByStatusParams {
  const factory GetPetsFindByStatusParams({
    /// Status values that need to be considered for filter
    required List<String> status,
  }) = _GetPetsFindByStatusParams;

  factory GetPetsFindByStatusParams.fromJson(Map<String, dynamic> json) =>
      _$GetPetsFindByStatusParamsFromJson(json);
}

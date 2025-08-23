// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names

import 'package:freezed_annotation/freezed_annotation.dart';

part 'find_pets_by_status_params.f.freezed.dart';
part 'find_pets_by_status_params.f.g.dart';

/// Query parameters for findPetsByStatus
@freezed
class FindPetsByStatusParams with _$FindPetsByStatusParams {
  const factory FindPetsByStatusParams({
    /// Status values that need to be considered for filter
    required List<String> status,
  }) = _FindPetsByStatusParams;

  factory FindPetsByStatusParams.fromJson(Map<String, dynamic> json) =>
      _$FindPetsByStatusParamsFromJson(json);
}
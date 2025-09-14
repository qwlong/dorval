// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names

import 'package:freezed_annotation/freezed_annotation.dart';

part 'get_pets_params.f.freezed.dart';
part 'get_pets_params.f.g.dart';

/// Query parameters for getPets
@freezed
class GetPetsParams with _$GetPetsParams {
  const factory GetPetsParams({
    /// How many items to return at one time (max 100)
    int? limit,

    /// The offset for pagination
    int? offset,
  }) = _GetPetsParams;

  factory GetPetsParams.fromJson(Map<String, dynamic> json) =>
      _$GetPetsParamsFromJson(json);
}

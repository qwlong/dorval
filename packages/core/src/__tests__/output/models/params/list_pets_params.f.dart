// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names

import 'package:freezed_annotation/freezed_annotation.dart';

part 'list_pets_params.f.freezed.dart';
part 'list_pets_params.f.g.dart';

/// Query parameters for listPets
@freezed
class ListPetsParams with _$ListPetsParams {
  const factory ListPetsParams({
    /// How many items to return at one time (max 100)
    String? limit,
  }) = _ListPetsParams;

  factory ListPetsParams.fromJson(Map<String, dynamic> json) =>
      _$ListPetsParamsFromJson(json);
}
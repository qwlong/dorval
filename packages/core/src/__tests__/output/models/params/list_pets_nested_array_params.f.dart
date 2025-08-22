// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names

import 'package:freezed_annotation/freezed_annotation.dart';

part 'list_pets_nested_array_params.f.freezed.dart';
part 'list_pets_nested_array_params.f.g.dart';

/// Query parameters for listPetsNestedArray
@freezed
class ListPetsNestedArrayParams with _$ListPetsNestedArrayParams {
  const factory ListPetsNestedArrayParams({
    /// How many items to return at one time (max 100)
    String? limit,
  }) = _ListPetsNestedArrayParams;

  factory ListPetsNestedArrayParams.fromJson(Map<String, dynamic> json) =>
      _$ListPetsNestedArrayParamsFromJson(json);
}
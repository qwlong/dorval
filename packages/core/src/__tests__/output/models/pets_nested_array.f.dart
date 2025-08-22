import 'package:freezed_annotation/freezed_annotation.dart';
import 'pet.f.dart';

part 'pets_nested_array.f.freezed.dart';
part 'pets_nested_array.f.g.dart';


@freezed
class PetsNestedArray with _$PetsNestedArray {
  const factory PetsNestedArray({
    List<Pet>? data,
  }) = _PetsNestedArray;

  factory PetsNestedArray.fromJson(Map<String, dynamic> json) =>
      _$PetsNestedArrayFromJson(json);
  
}
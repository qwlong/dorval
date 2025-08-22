import 'package:freezed_annotation/freezed_annotation.dart';

part 'pet.f.freezed.dart';
part 'pet.f.g.dart';


@freezed
class Pet with _$Pet {
  const factory Pet({
    required int id,
        /// Name of pet
    required String name,
    int? age,
    String? tag,
    String? email,
    String? callingCode,
    String? country,
  }) = _Pet;

  factory Pet.fromJson(Map<String, dynamic> json) =>
      _$PetFromJson(json);
  
}
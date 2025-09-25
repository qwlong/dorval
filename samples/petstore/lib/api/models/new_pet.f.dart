import 'package:freezed_annotation/freezed_annotation.dart';
import 'category.f.dart';
import 'new_pet_status_enum.f.dart';

part 'new_pet.f.freezed.dart';
part 'new_pet.f.g.dart';

@freezed
abstract class NewPet with _$NewPet {
  const factory NewPet({
    /// Name of the pet
    required String name,

    /// Type of pet
    String? tag,

    Category? category,

    /// Image URLs
    List<String>? photoUrls,

    /// pet status in the store
    NewPetStatusEnum? status,
  }) = _NewPet;

  factory NewPet.fromJson(Map<String, dynamic> json) =>
      _$NewPetFromJson(json);
}

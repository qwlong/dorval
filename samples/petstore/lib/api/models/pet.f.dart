import 'package:freezed_annotation/freezed_annotation.dart';
import 'new_pet.f.dart';
import 'category.f.dart';

part 'pet.f.freezed.dart';
part 'pet.f.g.dart';

@freezed
abstract class Pet with _$Pet {
  const factory Pet({
    /// Name of the pet
    required String name,

    /// Type of pet
    String? tag,

    Category? category,

    /// Image URLs
    List<String>? photoUrls,


    /// pet status in the store
    @Default('available') String? status,

    /// Unique id of the pet
    required int id,
  }) = _Pet;

  factory Pet.fromJson(Map<String, dynamic> json) =>
      _$PetFromJson(json);
}

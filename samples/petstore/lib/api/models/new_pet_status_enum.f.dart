import 'package:json_annotation/json_annotation.dart';

/// pet status in the store
enum NewPetStatusEnum {
  @JsonValue('available')
  available,

  @JsonValue('pending')
  pending,

  @JsonValue('sold')
  sold

}

/// Extension methods for NewPetStatusEnum
extension NewPetStatusEnumExtension on NewPetStatusEnum {
  String get value {
    switch (this) {
      case NewPetStatusEnum.available:
        return 'available';
      case NewPetStatusEnum.pending:
        return 'pending';
      case NewPetStatusEnum.sold:
        return 'sold';
    }
  }

  static NewPetStatusEnum? fromValue(String? value) {
    if (value == null) return null;
    switch (value) {
      case 'available':
        return NewPetStatusEnum.available;
      case 'pending':
        return NewPetStatusEnum.pending;
      case 'sold':
        return NewPetStatusEnum.sold;
      default:
        return null;
    }
  }
}

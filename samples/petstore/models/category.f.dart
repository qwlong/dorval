import 'package:freezed_annotation/freezed_annotation.dart';

part 'category.f.freezed.dart';
part 'category.f.g.dart';

@freezed
class Category with _$Category {
  const factory Category({
    int? id,

    /// Category name
    String? name,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);
}

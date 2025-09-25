import 'package:freezed_annotation/freezed_annotation.dart';

part 'error.f.freezed.dart';
part 'error.f.g.dart';

@freezed
abstract class Error with _$Error {
  const factory Error({
    /// Error code
    required int code,

    /// Error message
    required String message,
  }) = _Error;

  factory Error.fromJson(Map<String, dynamic> json) =>
      _$ErrorFromJson(json);
}

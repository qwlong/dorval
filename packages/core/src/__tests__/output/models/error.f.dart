import 'package:freezed_annotation/freezed_annotation.dart';

part 'error.f.freezed.dart';
part 'error.f.g.dart';


@freezed
class Error with _$Error {
  const factory Error({
    required int code,
    required String message,
  }) = _Error;

  factory Error.fromJson(Map<String, dynamic> json) =>
      _$ErrorFromJson(json);
  
}
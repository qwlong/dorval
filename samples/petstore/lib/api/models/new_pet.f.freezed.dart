// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'new_pet.f.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

NewPet _$NewPetFromJson(Map<String, dynamic> json) {
  return _NewPet.fromJson(json);
}

/// @nodoc
mixin _$NewPet {
  /// Name of the pet
  String get name => throw _privateConstructorUsedError;

  /// Type of pet
  String? get tag => throw _privateConstructorUsedError;
  Category? get category => throw _privateConstructorUsedError;

  /// Image URLs
  List<String>? get photoUrls => throw _privateConstructorUsedError;

  /// pet status in the store
  String? get status => throw _privateConstructorUsedError;

  /// Serializes this NewPet to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of NewPet
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $NewPetCopyWith<NewPet> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $NewPetCopyWith<$Res> {
  factory $NewPetCopyWith(NewPet value, $Res Function(NewPet) then) =
      _$NewPetCopyWithImpl<$Res, NewPet>;
  @useResult
  $Res call(
      {String name,
      String? tag,
      Category? category,
      List<String>? photoUrls,
      String? status});

  $CategoryCopyWith<$Res>? get category;
}

/// @nodoc
class _$NewPetCopyWithImpl<$Res, $Val extends NewPet>
    implements $NewPetCopyWith<$Res> {
  _$NewPetCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of NewPet
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? tag = freezed,
    Object? category = freezed,
    Object? photoUrls = freezed,
    Object? status = freezed,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
      category: freezed == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as Category?,
      photoUrls: freezed == photoUrls
          ? _value.photoUrls
          : photoUrls // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  /// Create a copy of NewPet
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CategoryCopyWith<$Res>? get category {
    if (_value.category == null) {
      return null;
    }

    return $CategoryCopyWith<$Res>(_value.category!, (value) {
      return _then(_value.copyWith(category: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$NewPetImplCopyWith<$Res> implements $NewPetCopyWith<$Res> {
  factory _$$NewPetImplCopyWith(
          _$NewPetImpl value, $Res Function(_$NewPetImpl) then) =
      __$$NewPetImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name,
      String? tag,
      Category? category,
      List<String>? photoUrls,
      String? status});

  @override
  $CategoryCopyWith<$Res>? get category;
}

/// @nodoc
class __$$NewPetImplCopyWithImpl<$Res>
    extends _$NewPetCopyWithImpl<$Res, _$NewPetImpl>
    implements _$$NewPetImplCopyWith<$Res> {
  __$$NewPetImplCopyWithImpl(
      _$NewPetImpl _value, $Res Function(_$NewPetImpl) _then)
      : super(_value, _then);

  /// Create a copy of NewPet
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? tag = freezed,
    Object? category = freezed,
    Object? photoUrls = freezed,
    Object? status = freezed,
  }) {
    return _then(_$NewPetImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      tag: freezed == tag
          ? _value.tag
          : tag // ignore: cast_nullable_to_non_nullable
              as String?,
      category: freezed == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as Category?,
      photoUrls: freezed == photoUrls
          ? _value._photoUrls
          : photoUrls // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$NewPetImpl implements _NewPet {
  const _$NewPetImpl(
      {required this.name,
      this.tag,
      this.category,
      final List<String>? photoUrls,
      this.status = 'available'})
      : _photoUrls = photoUrls;

  factory _$NewPetImpl.fromJson(Map<String, dynamic> json) =>
      _$$NewPetImplFromJson(json);

  /// Name of the pet
  @override
  final String name;

  /// Type of pet
  @override
  final String? tag;
  @override
  final Category? category;

  /// Image URLs
  final List<String>? _photoUrls;

  /// Image URLs
  @override
  List<String>? get photoUrls {
    final value = _photoUrls;
    if (value == null) return null;
    if (_photoUrls is EqualUnmodifiableListView) return _photoUrls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  /// pet status in the store
  @override
  @JsonKey()
  final String? status;

  @override
  String toString() {
    return 'NewPet(name: $name, tag: $tag, category: $category, photoUrls: $photoUrls, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$NewPetImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.tag, tag) || other.tag == tag) &&
            (identical(other.category, category) ||
                other.category == category) &&
            const DeepCollectionEquality()
                .equals(other._photoUrls, _photoUrls) &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, name, tag, category,
      const DeepCollectionEquality().hash(_photoUrls), status);

  /// Create a copy of NewPet
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$NewPetImplCopyWith<_$NewPetImpl> get copyWith =>
      __$$NewPetImplCopyWithImpl<_$NewPetImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$NewPetImplToJson(
      this,
    );
  }
}

abstract class _NewPet implements NewPet {
  const factory _NewPet(
      {required final String name,
      final String? tag,
      final Category? category,
      final List<String>? photoUrls,
      final String? status}) = _$NewPetImpl;

  factory _NewPet.fromJson(Map<String, dynamic> json) = _$NewPetImpl.fromJson;

  /// Name of the pet
  @override
  String get name;

  /// Type of pet
  @override
  String? get tag;
  @override
  Category? get category;

  /// Image URLs
  @override
  List<String>? get photoUrls;

  /// pet status in the store
  @override
  String? get status;

  /// Create a copy of NewPet
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$NewPetImplCopyWith<_$NewPetImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
